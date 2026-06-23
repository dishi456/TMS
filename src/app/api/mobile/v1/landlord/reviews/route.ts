import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → ended leases the landlord can rate the tenant on (not yet rated).
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  const leases = await prisma.lease.findMany({
    where: { landlordId: user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] }, ratings: { none: { direction: "LANDLORD_TO_TENANT" } } },
    orderBy: { endDate: "desc" },
    select: { id: true, endDate: true, property: { select: { name: true } }, tenant: { select: { fullName: true } } },
  });

  return json({
    items: leases.map((l) => ({ leaseId: l.id, endDate: l.endDate.toISOString(), property: l.property.name, tenant: l.tenant.fullName })),
  });
}

const criteria = z.object({
  rentDiscipline: z.coerce.number().int().min(1).max(5),
  propertyMaintenance: z.coerce.number().int().min(1).max(5),
  communication: z.coerce.number().int().min(1).max(5),
  ruleCompliance: z.coerce.number().int().min(1).max(5),
  conduct: z.coerce.number().int().min(1).max(5),
});
const schema = z.object({
  leaseId: z.string().min(1),
  stars: z.coerce.number().int().min(1).max(5),
  criteria,
  feedback: z.string().trim().optional(),
  recommend: z.boolean().optional(),
});

// POST → rate a tenant (LANDLORD_TO_TENANT) after the lease ends.
export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  const lease = await prisma.lease.findFirst({ where: { id: d.leaseId, landlordId: user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } } });
  if (!lease) return error("You can only rate the tenant after the lease has ended.", 403);

  await prisma.rating.upsert({
    where: { leaseId_direction: { leaseId: d.leaseId, direction: "LANDLORD_TO_TENANT" } },
    update: { stars: d.stars, feedback: d.feedback || null, recommend: !!d.recommend, criteria: d.criteria },
    create: {
      leaseId: d.leaseId, direction: "LANDLORD_TO_TENANT", raterId: user.id, rateeId: lease.tenantId,
      stars: d.stars, feedback: d.feedback || null, recommend: !!d.recommend, criteria: d.criteria, status: "VISIBLE",
    },
  });
  await audit({ actorId: user.id, action: "tenant.rate", entity: "Rating", entityId: d.leaseId });
  return json({ ok: true }, 201);
}
