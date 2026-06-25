import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/rentals -> the tenant's full rental history (every
// lease) with property, landlord, and the two-way reviews for each.
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const leases = await prisma.lease.findMany({
    where: { tenantId: user.id },
    orderBy: { startDate: "desc" },
    include: {
      property: {
        select: {
          id: true, name: true, address: true,
          documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
        },
      },
      landlord: { select: { id: true, fullName: true, avatarUrl: true } },
      ratings: { select: { direction: true, stars: true, feedback: true, recommend: true, status: true, createdAt: true } },
    },
  });

  return json({
    rentals: leases.map((l) => {
      const fromLandlord = l.ratings.find((r) => r.direction === "LANDLORD_TO_TENANT" && r.status === "VISIBLE");
      const fromTenant = l.ratings.find((r) => r.direction === "TENANT_TO_LANDLORD");
      return {
        id: l.id,
        status: l.status,
        monthlyRent: Number(l.monthlyRent),
        securityDeposit: Number(l.securityDeposit),
        startDate: l.startDate,
        endDate: l.endDate,
        noticeEffectiveDate: l.noticeEffectiveDate,
        property: {
          id: l.property.id,
          name: l.property.name,
          address: l.property.address,
          photo: l.property.documents[0] ? `/api/files/${l.property.documents[0].id}` : null,
        },
        landlord: { id: l.landlord.id, name: l.landlord.fullName, avatarUrl: l.landlord.avatarUrl },
        reviewFromLandlord: fromLandlord ? { stars: fromLandlord.stars, feedback: fromLandlord.feedback, recommend: fromLandlord.recommend } : null,
        reviewFromTenant: fromTenant ? { stars: fromTenant.stars, feedback: fromTenant.feedback, recommend: fromTenant.recommend } : null,
      };
    }),
  });
}
