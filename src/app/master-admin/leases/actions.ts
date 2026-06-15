"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { saveFile, removeFile } from "@/lib/storage";

export type FormState = { error?: string; success?: string } | undefined;

const MAX_BYTES = 8 * 1024 * 1024;

const schema = z.object({
  propertyId: z.string().min(1, "Select a property."),
  tenantId: z.string().min(1, "Select a tenant."),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.coerce.number().nonnegative("Rent must be ≥ 0."),
  securityDeposit: z.coerce.number().nonnegative().default(0),
  maintenanceFee: z.coerce.number().nonnegative().optional(),
  noticePeriodDays: z.coerce.number().int().min(0).default(30),
  terms: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "RENEWED", "TERMINATED", "EXPIRED", "COMPLETED"]),
});

// The lease's landlord must be the property's owner — derive it, never trust input.
async function landlordForProperty(propertyId: string): Promise<string | null> {
  const p = await prisma.property.findUnique({ where: { id: propertyId }, select: { landlordId: true } });
  return p?.landlordId ?? null;
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

// Save an uploaded file as a LEASE document and link it to the lease.
async function storeLeaseDocument(leaseId: string, ownerId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10);
  const key = `leases/${leaseId}/${randomUUID()}${ext}`;
  await saveFile(key, bytes);
  const doc = await prisma.document.create({
    data: {
      ownerId,
      leaseId,
      type: "LEASE",
      storageKey: key,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: bytes.length,
      label: file.name,
    },
  });
  await prisma.lease.update({ where: { id: leaseId }, data: { signedContractUrl: `/api/files/${doc.id}` } });
  return doc;
}

// Keep a property's availability in step with its active leases.
async function syncOccupancy(propertyId: string) {
  const active = await prisma.lease.count({
    where: { propertyId, status: { in: ["ACTIVE", "RENEWED"] } },
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: { availability: active > 0 ? "OCCUPIED" : "AVAILABLE" },
  });
}

// ---- Create ----
export async function createLease(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.endDate <= parsed.data.startDate) return { error: "End date must be after start date." };

  // Optional signed-agreement upload (e.g. a lease signed offline).
  const agreement = formData.get("agreement");
  const hasFile = agreement instanceof File && agreement.size > 0;
  if (hasFile && agreement.size > MAX_BYTES) return { error: "Agreement file is too large (max 8 MB)." };

  const landlordId = await landlordForProperty(parsed.data.propertyId);
  if (!landlordId) return { error: "Selected property no longer exists." };

  const created = await prisma.lease.create({ data: baseData(parsed.data, landlordId) });
  await syncOccupancy(created.propertyId);
  await audit({ actorId: session.user.id, action: "lease.create", entity: "Lease", entityId: created.id });

  if (hasFile) {
    await storeLeaseDocument(created.id, landlordId, agreement);
    await audit({ actorId: session.user.id, action: "lease.contractUpload", entity: "Lease", entityId: created.id });
  }

  revalidatePath("/master-admin/leases");
  redirect("/master-admin/leases?created=1");
}

// ---- Update / modify ----
export async function updateLease(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = schema.extend({ id: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.endDate <= parsed.data.startDate) return { error: "End date must be after start date." };
  const { id, ...rest } = parsed.data;

  const landlordId = await landlordForProperty(rest.propertyId);
  if (!landlordId) return { error: "Selected property no longer exists." };

  // Terms lock: once a lease is past DRAFT, terms are immutable server-side.
  const existing = await prisma.lease.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return { error: "Lease not found." };
  const data = baseData(rest, landlordId);
  if (existing.status !== "DRAFT") {
    const { terms: _terms, ...rest2 } = data;
    void _terms;
    return await applyUpdate(id, rest2, session.user.id);
  }
  return await applyUpdate(id, data, session.user.id);
}

async function applyUpdate(id: string, data: Record<string, unknown>, actorId: string): Promise<FormState> {
  const updated = await prisma.lease.update({ where: { id }, data });
  await syncOccupancy(updated.propertyId);
  await audit({ actorId, action: "lease.update", entity: "Lease", entityId: id });
  revalidatePath("/master-admin/leases");
  revalidatePath(`/master-admin/leases/${id}`);
  return { success: "Changes saved." };
}

// ---- Approve (DRAFT → ACTIVE) ----
export async function approveLease(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const lease = await prisma.lease.update({ where: { id }, data: { status: "ACTIVE" } });
  await syncOccupancy(lease.propertyId);
  await audit({ actorId: session.user.id, action: "lease.approve", entity: "Lease", entityId: id });
  revalidatePath("/master-admin/leases");
  revalidatePath(`/master-admin/leases/${id}`);
}

// ---- Renew (extend end date, status → RENEWED) ----
export async function renewLease(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const newEnd = new Date(String(formData.get("endDate")));
  if (Number.isNaN(newEnd.getTime())) redirect(`/master-admin/leases/${id}?error=baddate`);

  const lease = await prisma.lease.update({
    where: { id },
    data: { status: "RENEWED", endDate: newEnd },
  });
  await syncOccupancy(lease.propertyId);
  await audit({
    actorId: session.user.id,
    action: "lease.renew",
    entity: "Lease",
    entityId: id,
    metadata: { endDate: newEnd.toISOString() },
  });
  revalidatePath("/master-admin/leases");
  revalidatePath(`/master-admin/leases/${id}`);
}

// ---- Terminate ----
export async function terminateLease(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const lease = await prisma.lease.update({ where: { id }, data: { status: "TERMINATED" } });
  await syncOccupancy(lease.propertyId);
  await audit({ actorId: session.user.id, action: "lease.terminate", entity: "Lease", entityId: id });
  revalidatePath("/master-admin/leases");
  revalidatePath(`/master-admin/leases/${id}`);
}

// ---- Upload signed contract ----
export async function uploadLeaseContract(formData: FormData) {
  const session = await requireAdmin();
  const leaseId = String(formData.get("leaseId"));
  const file = formData.get("file");
  const back = `/master-admin/leases/${leaseId}`;

  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  if (file.size > MAX_BYTES) redirect(`${back}?error=toobig`);

  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, select: { landlordId: true } });
  if (!lease) redirect("/master-admin/leases");

  const doc = await storeLeaseDocument(leaseId, lease.landlordId, file);
  await audit({ actorId: session.user.id, action: "lease.contractUpload", entity: "Lease", entityId: leaseId, metadata: { docId: doc.id } });

  revalidatePath(back);
  redirect(`${back}?uploaded=1`);
}

// ---- Delete a lease document ----
export async function deleteLeaseDocument(formData: FormData) {
  const session = await requireAdmin();
  const docId = String(formData.get("docId"));
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) redirect("/master-admin/leases");

  if (doc.storageKey) await removeFile(doc.storageKey);
  await prisma.document.delete({ where: { id: docId } });
  if (doc.leaseId) {
    await prisma.lease.update({ where: { id: doc.leaseId }, data: { signedContractUrl: null } });
  }
  await audit({ actorId: session.user.id, action: "lease.contractDelete", entity: "Lease", entityId: doc.leaseId, metadata: { docId } });

  const back = doc.leaseId ? `/master-admin/leases/${doc.leaseId}` : "/master-admin/leases";
  revalidatePath(back);
  redirect(back);
}
