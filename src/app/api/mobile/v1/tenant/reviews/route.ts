import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/reviews → ratings the tenant gave + received.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const [given, received] = await Promise.all([
    prisma.rating.findMany({
      where: { raterId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, leaseId: true, stars: true, feedback: true, recommend: true,
        criteria: true, createdAt: true,
        ratee: { select: { fullName: true } },
      },
    }),
    prisma.rating.findMany({
      where: { rateeId: user.id, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, leaseId: true, stars: true, feedback: true, recommend: true,
        criteria: true, createdAt: true,
        rater: { select: { fullName: true } },
      },
    }),
  ]);

  return json({
    given: given.map((r) => ({
      id: r.id, leaseId: r.leaseId, stars: r.stars, feedback: r.feedback,
      recommend: r.recommend, criteria: r.criteria, createdAt: r.createdAt.toISOString(),
      landlordName: r.ratee.fullName,
    })),
    received: received.map((r) => ({
      id: r.id, leaseId: r.leaseId, stars: r.stars, feedback: r.feedback,
      recommend: r.recommend, criteria: r.criteria, createdAt: r.createdAt.toISOString(),
      fromName: r.rater.fullName,
    })),
  });
}

const criteriaSchema = z.object({
  propertyQuality: z.coerce.number().int().min(1).max(5),
  maintenanceSupport: z.coerce.number().int().min(1).max(5),
  communication: z.coerce.number().int().min(1).max(5),
  transparency: z.coerce.number().int().min(1).max(5),
  overall: z.coerce.number().int().min(1).max(5),
});
const schema = z.object({
  leaseId: z.string().min(1),
  stars: z.coerce.number().int().min(1).max(5),
  criteria: criteriaSchema,
  feedback: z.string().trim().optional(),
  recommend: z.boolean().optional(),
});

// POST /api/mobile/v1/tenant/reviews → rate the landlord (after lease ends).
// Mirrors src/app/tenant/reviews/actions.ts (rateLandlord).
export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  const lease = await prisma.lease.findFirst({
    where: { id: d.leaseId, tenantId: user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
  });
  if (!lease) return error("You can only rate the landlord after the lease has ended.", 403);

  await prisma.rating.upsert({
    where: { leaseId_direction: { leaseId: d.leaseId, direction: "TENANT_TO_LANDLORD" } },
    update: { stars: d.stars, feedback: d.feedback || null, recommend: !!d.recommend, criteria: d.criteria },
    create: {
      leaseId: d.leaseId,
      direction: "TENANT_TO_LANDLORD",
      raterId: user.id,
      rateeId: lease.landlordId,
      stars: d.stars,
      feedback: d.feedback || null,
      recommend: !!d.recommend,
      criteria: d.criteria,
      status: "VISIBLE",
    },
  });
  await audit({ actorId: user.id, action: "landlord.rate", entity: "Rating", entityId: d.leaseId });

  return json({ ok: true }, 201);
}
