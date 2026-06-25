import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/reviews/pending -> ended leases the landlord can rate the tenant on
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const leases = await prisma.lease.findMany({
    where: { landlordId: user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
    orderBy: { endDate: "desc" },
    include: {
      tenant: { select: { id: true, fullName: true } },
      property: { select: { id: true, name: true } },
      ratings: { where: { direction: "LANDLORD_TO_TENANT" } },
    },
  });
  return json({
    leases: leases.map((l) => ({
      leaseId: l.id, tenant: l.tenant, property: l.property, endDate: l.endDate,
      existingRating: l.ratings[0]
        ? { stars: l.ratings[0].stars, feedback: l.ratings[0].feedback, recommend: l.ratings[0].recommend, criteria: l.ratings[0].criteria }
        : null,
    })),
  });
}
