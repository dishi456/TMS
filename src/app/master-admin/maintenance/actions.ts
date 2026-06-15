"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

const STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function revalidate(id: string) {
  revalidatePath("/master-admin/maintenance");
  revalidatePath(`/master-admin/maintenance/${id}`);
}

// SRS: Assign maintenance personnel
export async function assignMaintenance(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const assignedTo = String(formData.get("assignedTo") || "").trim();
  if (!assignedTo) redirect(`/master-admin/maintenance/${id}?error=noassignee`);

  await prisma.maintenanceRequest.update({
    where: { id },
    data: { assignedTo, status: "ASSIGNED" },
  });
  await audit({
    actorId: session.user.id,
    action: "maintenance.assign",
    entity: "MaintenanceRequest",
    entityId: id,
    metadata: { assignedTo },
  });
  revalidate(id);
  redirect(`/master-admin/maintenance/${id}?assigned=1`);
}

// SRS: Track maintenance progress / Close completed requests
export async function setMaintenanceStatus(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const raw = String(formData.get("status"));
  const status = (STATUSES.includes(raw) ? raw : "PENDING") as
    | "PENDING"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "RESOLVED"
    | "CLOSED";

  await prisma.maintenanceRequest.update({ where: { id }, data: { status } });
  await audit({
    actorId: session.user.id,
    action: status === "CLOSED" ? "maintenance.close" : "maintenance.status",
    entity: "MaintenanceRequest",
    entityId: id,
    metadata: { status },
  });
  revalidate(id);
  redirect(`/master-admin/maintenance/${id}`);
}
