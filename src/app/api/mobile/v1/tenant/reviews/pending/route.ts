import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/reviews/pending → ended leases the tenant may rate
// but hasn't yet (no TENANT_TO_LANDLORD rating exists).
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const leases = await prisma.lease.findMany({
    where: {
      tenantId: user.id,
      status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] },
      ratings: { none: { direction: "TENANT_TO_LANDLORD" } },
    },
    orderBy: { endDate: "desc" },
    select: {
      id: true,
      endDate: true,
      status: true,
      property: { select: { name: true, address: true } },
      landlord: { select: { fullName: true } },
    },
  });

  return json({
    items: leases.map((l) => ({
      leaseId: l.id,
      endDate: l.endDate.toISOString(),
      status: l.status,
      property: l.property,
      landlordName: l.landlord.fullName,
    })),
  });
}
