"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

const STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];

// Verify the request is on one of this landlord's properties.
async function ownRequest(landlordId: string, id: string) {
  return prisma.maintenanceRequest.findFirst({ where: { id, property: { landlordId } } });
}

function revalidate(id: string) {
  revalidatePath("/landlord/maintenance");
  revalidatePath(`/landlord/maintenance/${id}`);
}

// SRS: Approve / Reject maintenance requests
export async function approveMaintenance(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const req = await ownRequest(session.user.id, id);
  if (!req) redirect("/landlord/maintenance");
  await prisma.maintenanceRequest.update({ where: { id }, data: { status: "ASSIGNED" } });
  await audit({ actorId: session.user.id, action: "maintenance.approve", entity: "MaintenanceRequest", entityId: id });
  await notify(req.tenantId, { type: "maintenance", title: "Maintenance request updated", body: "Status: ASSIGNED", link: "/tenant/maintenance" });
  revalidate(id);
  redirect(`/landlord/maintenance/${id}`);
}

export async function rejectMaintenance(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const req = await ownRequest(session.user.id, id);
  if (!req) redirect("/landlord/maintenance");
  await prisma.maintenanceRequest.update({ where: { id }, data: { status: "REJECTED" } });
  await audit({ actorId: session.user.id, action: "maintenance.reject", entity: "MaintenanceRequest", entityId: id });
  await notify(req.tenantId, { type: "maintenance", title: "Maintenance request updated", body: "Status: REJECTED", link: "/tenant/maintenance" });
  revalidate(id);
  redirect(`/landlord/maintenance/${id}`);
}

// SRS: Assign technicians
export async function assignMaintenance(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  if (!(await ownRequest(session.user.id, id))) redirect("/landlord/maintenance");
  const assignedTo = String(formData.get("assignedTo") || "").trim();
  if (!assignedTo) redirect(`/landlord/maintenance/${id}?error=noassignee`);
  await prisma.maintenanceRequest.update({ where: { id }, data: { assignedTo, status: "ASSIGNED" } });
  await audit({ actorId: session.user.id, action: "maintenance.assign", entity: "MaintenanceRequest", entityId: id, metadata: { assignedTo } });
  revalidate(id);
  redirect(`/landlord/maintenance/${id}?assigned=1`);
}

// SRS: Update progress / Mark resolved
export async function setMaintenanceStatus(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const req = await ownRequest(session.user.id, id);
  if (!req) redirect("/landlord/maintenance");
  const raw = String(formData.get("status"));
  const status = (STATUSES.includes(raw) ? raw : "PENDING") as
    | "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
  await prisma.maintenanceRequest.update({ where: { id }, data: { status } });
  await notify(req.tenantId, { type: "maintenance", title: "Maintenance request updated", body: `Status: ${status}`, link: "/tenant/maintenance" });
  await audit({
    actorId: session.user.id,
    action: status === "CLOSED" ? "maintenance.close" : status === "RESOLVED" ? "maintenance.resolve" : "maintenance.status",
    entity: "MaintenanceRequest",
    entityId: id,
    metadata: { status },
  });
  revalidate(id);
  redirect(`/landlord/maintenance/${id}`);
}
