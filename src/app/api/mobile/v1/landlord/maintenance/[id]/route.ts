import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function own(landlordId: string, id: string) {
  return prisma.maintenanceRequest.findFirst({ where: { id, property: { landlordId } } });
}

// GET /api/mobile/v1/landlord/maintenance/{id}
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const r = await prisma.maintenanceRequest.findFirst({
    where: { id, property: { landlordId: user.id } },
    include: { property: { select: { id: true, name: true } }, tenant: { select: { id: true, fullName: true, phone: true } } },
  });
  if (!r) return json({ error: "Not found." }, 404);
  return json({ request: { ...r, images: toStrArr(r.images) } });
}

const schema = z.object({
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"]).optional(),
  assignedTo: z.string().optional(),
});

// PATCH /api/mobile/v1/landlord/maintenance/{id}  { status?, assignedTo? }
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const r = await own(user.id, id);
  if (!r) return json({ error: "Not found." }, 404);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  if (!d.status && d.assignedTo === undefined) return json({ error: "Nothing to update." }, 400);

  const data = {
    ...(d.status ? { status: d.status } : {}),
    ...(d.assignedTo !== undefined ? { assignedTo: d.assignedTo || null, ...(d.assignedTo ? { status: "ASSIGNED" as const } : {}) } : {}),
  };
  await prisma.maintenanceRequest.update({ where: { id }, data });
  await audit({ actorId: user.id, action: "maintenance.status", entity: "MaintenanceRequest", entityId: id, metadata: data });
  if (d.status) await notify(r.tenantId, { type: "maintenance", title: "Maintenance request updated", body: `Status: ${d.status}`, link: "/tenant/maintenance" });
  return json({ ok: true });
}
