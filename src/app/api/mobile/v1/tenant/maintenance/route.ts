import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/maintenance → the tenant's maintenance requests.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const items = await prisma.maintenanceRequest.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, priority: true, images: true, createdAt: true },
  });

  return json({
    items: items.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      priority: m.priority,
      images: m.images,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(3, "Enter a short title."),
  description: z.string().min(5, "Describe the issue."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  imageUrls: z.array(z.string()).optional(),
  propertyId: z.string().optional(), // optional; defaults to the active lease's property
});

// POST /api/mobile/v1/tenant/maintenance → create a request.
// Upload images first via POST /api/upload (purpose "maintenance-image").
export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  // The tenant must have a lease on the target property. If no propertyId was
  // sent, use their active lease's property.
  const lease = await prisma.lease.findFirst({
    where: {
      tenantId: user.id,
      ...(d.propertyId ? { propertyId: d.propertyId } : { status: { in: ["ACTIVE", "RENEWED"] } }),
    },
    orderBy: { startDate: "desc" },
    select: { propertyId: true },
  });
  if (!lease) return error("You don't have a lease on that property.", 403);

  const created = await prisma.maintenanceRequest.create({
    data: {
      propertyId: lease.propertyId,
      tenantId: user.id,
      title: d.title,
      description: d.description,
      priority: d.priority,
      status: "PENDING",
      images: (d.imageUrls ?? []).filter(Boolean).slice(0, 5),
    },
  });
  await audit({ actorId: user.id, action: "maintenance.submit", entity: "MaintenanceRequest", entityId: created.id });

  const prop = await prisma.property.findUnique({ where: { id: lease.propertyId }, select: { landlordId: true } });
  await notify(prop?.landlordId, {
    type: "maintenance",
    title: "New maintenance request",
    body: d.title,
    link: `/landlord/maintenance/${created.id}`,
  });

  return json({ id: created.id }, 201);
}
