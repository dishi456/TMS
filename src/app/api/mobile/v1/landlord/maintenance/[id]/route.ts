import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET detail
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const m = await prisma.maintenanceRequest.findFirst({
    where: { id, property: { landlordId: user.id } },
    select: {
      id: true, title: true, description: true, status: true, priority: true, assignedTo: true, images: true, createdAt: true,
      property: { select: { name: true } }, tenant: { select: { fullName: true, phone: true } },
    },
  });
  if (!m) return error("Not found", 404);
  return json({
    id: m.id, title: m.title, description: m.description, status: m.status, priority: m.priority,
    assignedTo: m.assignedTo, images: m.images, createdAt: m.createdAt.toISOString(),
    property: m.property.name, tenant: m.tenant.fullName, tenantPhone: m.tenant.phone,
  });
}

const schema = z.object({
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"]).optional(),
  assignedTo: z.string().optional(),
});

// POST /api/mobile/v1/landlord/maintenance/{id} → update status / assign a technician.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Invalid request.", 400);
  const d = parsed.data;

  const m = await prisma.maintenanceRequest.findFirst({ where: { id, property: { landlordId: user.id } }, select: { id: true, tenantId: true } });
  if (!m) return error("Not found", 404);

  const data: { status?: typeof d.status; assignedTo?: string } = {};
  if (d.assignedTo !== undefined) { data.assignedTo = d.assignedTo; data.status = data.status ?? "ASSIGNED"; }
  if (d.status) data.status = d.status;
  if (!data.status && data.assignedTo === undefined) return error("Nothing to update.", 400);

  await prisma.maintenanceRequest.update({ where: { id }, data });
  await audit({ actorId: user.id, action: "maintenance.update", entity: "MaintenanceRequest", entityId: id });
  await notify(m.tenantId, { type: "maintenance", title: "Maintenance request updated", body: data.status ? `Status: ${data.status}` : undefined, link: `/tenant/maintenance/${id}` });

  return json({ ok: true });
}
