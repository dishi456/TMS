import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/reviews -> ratings the tenant gave and received
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const [given, received] = await Promise.all([
    prisma.rating.findMany({
      where: { raterId: user.id },
      orderBy: { createdAt: "desc" },
      include: { ratee: { select: { id: true, fullName: true } }, lease: { select: { id: true, property: { select: { name: true } } } } },
    }),
    prisma.rating.findMany({
      where: { rateeId: user.id, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      include: { rater: { select: { id: true, fullName: true } }, lease: { select: { id: true, property: { select: { name: true } } } } },
    }),
  ]);
  return json({ given, received });
}

const star = z.coerce.number().int().min(1).max(5);
const schema = z.object({
  leaseId: z.string().min(1),
  stars: star,
  feedback: z.string().trim().optional(),
  recommend: z.boolean().optional(),
  criteria: z.object({
    propertyQuality: star, maintenanceSupport: star, communication: star, transparency: star, overall: star,
  }),
});

// POST /api/mobile/v1/tenant/reviews -> rate the landlord (current or ended lease)
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  const lease = await prisma.lease.findFirst({
    where: { id: d.leaseId, tenantId: user.id, status: { in: ["ACTIVE", "RENEWED", "COMPLETED", "EXPIRED", "TERMINATED"] } },
  });
  if (!lease) return json({ error: "You can only rate the landlord of one of your leases." }, 400);

  await prisma.rating.upsert({
    where: { leaseId_direction: { leaseId: d.leaseId, direction: "TENANT_TO_LANDLORD" } },
    update: { stars: d.stars, feedback: d.feedback || null, recommend: !!d.recommend, criteria: d.criteria },
    create: {
      leaseId: d.leaseId, direction: "TENANT_TO_LANDLORD", raterId: user.id, rateeId: lease.landlordId,
      stars: d.stars, feedback: d.feedback || null, recommend: !!d.recommend, criteria: d.criteria, status: "VISIBLE",
    },
  });
  await audit({ actorId: user.id, action: "landlord.rate", entity: "Rating", entityId: d.leaseId });
  return json({ ok: true });
}
