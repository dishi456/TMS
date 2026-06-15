"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { saveFile, removeFile } from "@/lib/storage";

export type FormState = { error?: string; success?: string } | undefined;
const MAX_BYTES = 8 * 1024 * 1024;

const schema = z.object({
  propertyId: z.string().min(1, "Select a property."),
  tenantId: z.string().min(1, "Select a tenant."),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.coerce.number().nonnegative(),
  securityDeposit: z.coerce.number().nonnegative().default(0),
  maintenanceFee: z.coerce.number().nonnegative().optional(),
  noticePeriodDays: z.coerce.number().int().min(0).default(30),
  terms: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "RENEWED", "TERMINATED", "EXPIRED", "COMPLETED"]),
});

// Property and tenant must both belong to this landlord.
async function validateOwnership(landlordId: string, propertyId: string, tenantId: string) {
  const [prop, tenant] = await Promise.all([
    prisma.property.findFirst({ where: { id: propertyId, landlordId } }),
    prisma.user.findFirst({ where: { id: tenantId, role: "TENANT", landlordId } }),
  ]);
  return !!prop && !!tenant;
}

async function ownLease(landlordId: string, leaseId: string) {
  return prisma.lease.findFirst({ where: { id: leaseId, landlordId } });
}

function baseData(d: z.infer<typeof schema>, landlordId: string) {
  return {
    propertyId: d.propertyId,
    landlordId,
    tenantId: d.tenantId,
    startDate: d.startDate,
    endDate: d.endDate,
    monthlyRent: d.monthlyRent,
    securityDeposit: d.securityDeposit,
    maintenanceFee: d.maintenanceFee ?? null,
    noticePeriodDays: d.noticePeriodDays,
    terms: d.terms && d.terms.length > 0 ? d.terms : null,
    status: d.status,
  };
}

async function syncOccupancy(propertyId: string) {
  const active = await prisma.lease.count({ where: { propertyId, status: { in: ["ACTIVE", "RENEWED"] } } });
  await prisma.property.update({ where: { id: propertyId }, data: { availability: active > 0 ? "OCCUPIED" : "AVAILABLE" } });
}

async function storeLeaseDocument(leaseId: string, ownerId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10);
  const key = `leases/${leaseId}/${randomUUID()}${ext}`;
  await saveFile(key, bytes);
  const doc = await prisma.document.create({
    data: { ownerId, leaseId, type: "LEASE", storageKey: key, fileName: file.name, contentType: file.type || null, sizeBytes: bytes.length, label: file.name },
  });
  await prisma.lease.update({ where: { id: leaseId }, data: { signedContractUrl: `/api/files/${doc.id}` } });
  return doc;
}

export async function createLease(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireLandlord();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.endDate <= parsed.data.startDate) return { error: "End date must be after start date." };
  if (!(await validateOwnership(session.user.id, parsed.data.propertyId, parsed.data.tenantId)))
    return { error: "Property/tenant not found in your account." };

  const agreement = formData.get("agreement");
  const hasFile = agreement instanceof File && agreement.size > 0;
  if (hasFile && agreement.size > MAX_BYTES) return { error: "Agreement file is too large (max 8 MB)." };

  const created = await prisma.lease.create({ data: baseData(parsed.data, session.user.id) });
  await syncOccupancy(created.propertyId);
  await audit({ actorId: session.user.id, action: "lease.create", entity: "Lease", entityId: created.id });
  if (hasFile) await storeLeaseDocument(created.id, session.user.id, agreement);

  revalidatePath("/landlord/leases");
  redirect("/landlord/leases?created=1");
}

export async function updateLease(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireLandlord();
  const parsed = schema.extend({ id: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.endDate <= parsed.data.startDate) return { error: "End date must be after start date." };
  const { id, ...rest } = parsed.data;
  const existingLease = await ownLease(session.user.id, id);
  if (!existingLease) return { error: "Lease not found." };
  if (!(await validateOwnership(session.user.id, rest.propertyId, rest.tenantId)))
    return { error: "Property/tenant not found in your account." };

  // Terms lock: terms are immutable once the lease is past DRAFT.
  const data: Record<string, unknown> = baseData(rest, session.user.id);
  if (existingLease.status !== "DRAFT") delete data.terms;

  const updated = await prisma.lease.update({ where: { id }, data });
  await syncOccupancy(updated.propertyId);
  await audit({ actorId: session.user.id, action: "lease.update", entity: "Lease", entityId: id });
  revalidatePath("/landlord/leases");
  revalidatePath(`/landlord/leases/${id}`);
  return { success: "Changes saved." };
}

async function setStatus(leaseId: string, landlordId: string, status: "ACTIVE" | "RENEWED" | "TERMINATED", action: string, extra?: { endDate?: Date }) {
  const lease = await ownLease(landlordId, leaseId);
  if (!lease) redirect("/landlord/leases");
  const updated = await prisma.lease.update({ where: { id: leaseId }, data: { status, ...(extra?.endDate ? { endDate: extra.endDate } : {}) } });
  await syncOccupancy(updated.propertyId);
  await audit({ actorId: landlordId, action, entity: "Lease", entityId: leaseId });
}

export async function approveLease(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  await setStatus(id, session.user.id, "ACTIVE", "lease.approve");
  revalidatePath("/landlord/leases"); revalidatePath(`/landlord/leases/${id}`);
  redirect(`/landlord/leases/${id}`);
}

export async function terminateLease(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  await setStatus(id, session.user.id, "TERMINATED", "lease.terminate");
  revalidatePath("/landlord/leases"); revalidatePath(`/landlord/leases/${id}`);
  redirect(`/landlord/leases/${id}`);
}

export async function renewLease(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const newEnd = new Date(String(formData.get("endDate")));
  if (Number.isNaN(newEnd.getTime())) redirect(`/landlord/leases/${id}?error=baddate`);
  await setStatus(id, session.user.id, "RENEWED", "lease.renew", { endDate: newEnd });
  revalidatePath("/landlord/leases"); revalidatePath(`/landlord/leases/${id}`);
  redirect(`/landlord/leases/${id}`);
}

// ---- Give notice to terminate (landlord side) ----
export async function giveNotice(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const lease = await ownLease(session.user.id, id);
  if (!lease) redirect("/landlord/leases");
  if ((lease.status === "ACTIVE" || lease.status === "RENEWED") && lease.noticeGivenAt === null) {
    const now = new Date();
    const effective = new Date(now.getTime() + lease.noticePeriodDays * 86400000);
    await prisma.lease.update({
      where: { id },
      data: { noticeGivenAt: now, noticeByParty: "LANDLORD", noticeEffectiveDate: effective },
    });
    await audit({ actorId: session.user.id, action: "lease.notice", entity: "Lease", entityId: id });
    await notify(lease.tenantId, { type: "lease", title: "Landlord gave notice to terminate", link: "/tenant/lease" });
  }
  revalidatePath("/landlord/leases");
  revalidatePath(`/landlord/leases/${id}`);
  redirect(`/landlord/leases/${id}`);
}

export async function uploadLeaseContract(formData: FormData) {
  const session = await requireLandlord();
  const leaseId = String(formData.get("leaseId"));
  const back = `/landlord/leases/${leaseId}`;
  if (!(await ownLease(session.user.id, leaseId))) redirect("/landlord/leases");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  if (file.size > MAX_BYTES) redirect(`${back}?error=toobig`);

  const doc = await storeLeaseDocument(leaseId, session.user.id, file);
  await audit({ actorId: session.user.id, action: "lease.contractUpload", entity: "Lease", entityId: leaseId, metadata: { docId: doc.id } });
  revalidatePath(back);
  redirect(`${back}?uploaded=1`);
}

export async function deleteLeaseDocument(formData: FormData) {
  const session = await requireLandlord();
  const docId = String(formData.get("docId"));
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc || doc.ownerId !== session.user.id) redirect("/landlord/leases");
  if (doc.storageKey) await removeFile(doc.storageKey);
  await prisma.document.delete({ where: { id: docId } });
  if (doc.leaseId) await prisma.lease.update({ where: { id: doc.leaseId }, data: { signedContractUrl: null } });
  const back = doc.leaseId ? `/landlord/leases/${doc.leaseId}` : "/landlord/leases";
  revalidatePath(back);
  redirect(back);
}
