import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/reviews/pending -> ended leases the tenant can rate
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const leases = await prisma.lease.findMany({
    where: { tenantId: user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
    orderBy: { endDate: "desc" },
    include: {
      property: { select: { id: true, name: true } },
      landlord: { select: { id: true, fullName: true } },
      ratings: { where: { direction: "TENANT_TO_LANDLORD" } },
    },
  });
  return json({
    leases: leases.map((l) => ({
      leaseId: l.id,
      property: l.property,
      landlord: l.landlord,
      endDate: l.endDate,
      existingRating: l.ratings[0]
        ? { stars: l.ratings[0].stars, feedback: l.ratings[0].feedback, recommend: l.ratings[0].recommend, criteria: l.ratings[0].criteria }
        : null,
    })),
  });
}
