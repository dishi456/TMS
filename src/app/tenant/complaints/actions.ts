"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export type FormState = { error?: string } | undefined;

const schema = z.object({
  propertyId: z.string().optional(),
  subject: z.string().min(3, "Enter a subject."),
  description: z.string().min(5, "Describe your complaint."),
});

export async function submitComplaint(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // If a property is given, ensure the tenant has a lease there.
  let propertyId: string | null = null;
  if (d.propertyId) {
    const lease = await prisma.lease.findFirst({ where: { tenantId: session.user.id, propertyId: d.propertyId } });
    if (!lease) return { error: "You don't have a lease on that property." };
    propertyId = d.propertyId;
  }

  const complaint = await prisma.complaint.create({
    data: { tenantId: session.user.id, propertyId, subject: d.subject, description: d.description, status: "OPEN" },
  });
  await audit({ actorId: session.user.id, action: "complaint.submit", entity: "Complaint", entityId: complaint.id });

  let landlordId: string | null | undefined;
  if (propertyId) {
    const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { landlordId: true } });
    landlordId = prop?.landlordId;
  } else {
    const tenant = await prisma.user.findUnique({ where: { id: session.user.id }, select: { landlordId: true } });
    landlordId = tenant?.landlordId;
  }
  await notify(landlordId, { type: "complaint", title: "New complaint submitted", body: d.subject, link: `/landlord/complaints/${complaint.id}` });

  revalidatePath("/tenant/complaints");
  redirect("/tenant/complaints?created=1");
}

async function ownComplaint(tenantId: string, id: string) {
  return prisma.complaint.findFirst({ where: { id, tenantId } });
}

export async function replyComplaint(formData: FormData) {
  const session = await requireTenant();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") || "").trim();
  if (!(await ownComplaint(session.user.id, id))) redirect("/tenant/complaints");
  if (!body) redirect(`/tenant/complaints/${id}?error=empty`);
  await prisma.complaintMessage.create({ data: { complaintId: id, authorId: session.user.id, body } });
  revalidatePath(`/tenant/complaints/${id}`);
  redirect(`/tenant/complaints/${id}`);
}

export async function reopenComplaint(formData: FormData) {
  const session = await requireTenant();
  const id = String(formData.get("id"));
  if (!(await ownComplaint(session.user.id, id))) redirect("/tenant/complaints");
  await prisma.complaint.update({ where: { id }, data: { status: "REOPENED" } });
  await audit({ actorId: session.user.id, action: "complaint.reopen", entity: "Complaint", entityId: id });
  revalidatePath(`/tenant/complaints/${id}`);
  revalidatePath("/tenant/complaints");
  redirect(`/tenant/complaints/${id}`);
}
