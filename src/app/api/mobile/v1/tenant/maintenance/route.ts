import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/maintenance -> list the tenant's requests
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const items = await prisma.maintenanceRequest.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, name: true } } },
  });
  return json({
    requests: items.map((r) => ({
      id: r.id, title: r.title, description: r.description, priority: r.priority,
      status: r.status, images: toStrArr(r.images), assignedTo: r.assignedTo,
      property: r.property, createdAt: r.createdAt, updatedAt: r.updatedAt,
    })),
  });
}

const schema = z.object({
  propertyId: z.string().min(1, "Select your property."),
  title: z.string().min(3, "Enter a short title."),
  description: z.string().min(5, "Describe the issue."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  imageUrls: z.array(z.string()).optional(),
});

// POST /api/mobile/v1/tenant/maintenance  { propertyId, title, description, priority, imageUrls[] }
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  const lease = await prisma.lease.findFirst({ where: { tenantId: user.id, propertyId: d.propertyId } });
  if (!lease) return json({ error: "You don't have a lease on that property." }, 400);

  const row = await prisma.maintenanceRequest.create({
    data: {
      propertyId: d.propertyId, tenantId: user.id, title: d.title, description: d.description,
      priority: d.priority, status: "PENDING", images: (d.imageUrls ?? []).slice(0, 5),
    },
  });
  await audit({ actorId: user.id, action: "maintenance.submit", entity: "MaintenanceRequest", entityId: row.id });
  const prop = await prisma.property.findUnique({ where: { id: d.propertyId }, select: { landlordId: true } });
  await notify(prop?.landlordId, { type: "maintenance", title: "New maintenance request", body: d.title, link: `/landlord/maintenance/${row.id}` });

  return json({ ok: true, id: row.id });
}
