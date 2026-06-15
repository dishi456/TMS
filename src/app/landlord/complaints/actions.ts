"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

async function ownComplaint(landlordId: string, id: string) {
  return prisma.complaint.findFirst({ where: { id, property: { landlordId } } });
}

export async function respondComplaint(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") || "").trim();
  const c = await ownComplaint(session.user.id, id);
  if (!c) redirect("/landlord/complaints");
  if (!body) redirect(`/landlord/complaints/${id}?error=empty`);

  await prisma.complaintMessage.create({ data: { complaintId: id, authorId: session.user.id, body } });
  await prisma.complaint.update({ where: { id }, data: { status: "RESPONDED" } });
  await audit({ actorId: session.user.id, action: "complaint.respond", entity: "Complaint", entityId: id });
  await notify(c.tenantId, { type: "complaint", title: "New response to your complaint", link: `/tenant/complaints/${id}` });
  revalidatePath(`/landlord/complaints/${id}`);
  revalidatePath("/landlord/complaints");
  redirect(`/landlord/complaints/${id}`);
}

export async function setComplaintStatus(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const c = await ownComplaint(session.user.id, id);
  if (!c) redirect("/landlord/complaints");
  const raw = String(formData.get("status"));
  const status = (["OPEN", "RESPONDED", "RESOLVED", "CLOSED", "REOPENED"].includes(raw) ? raw : "OPEN") as
    | "OPEN" | "RESPONDED" | "RESOLVED" | "CLOSED" | "REOPENED";

  await prisma.complaint.update({ where: { id }, data: { status } });
  await notify(c.tenantId, { type: "complaint", title: `Complaint ${status.toLowerCase()}`, link: `/tenant/complaints/${id}` });
  await audit({
    actorId: session.user.id,
    action: status === "RESOLVED" ? "complaint.resolve" : status === "CLOSED" ? "complaint.close" : "complaint.status",
    entity: "Complaint",
    entityId: id,
    metadata: { status },
  });
  revalidatePath(`/landlord/complaints/${id}`);
  revalidatePath("/landlord/complaints");
  redirect(`/landlord/complaints/${id}`);
}
