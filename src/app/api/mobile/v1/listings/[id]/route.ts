import { prisma } from "@/lib/prisma";
import { json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/listings/{idOrRef} -> full public detail for one property
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const p = await prisma.property.findFirst({
    where: { OR: [{ id }, { ref: id }], approved: true, listedPublic: true },
    include: {
      landlord: { select: { id: true, fullName: true, verified: true } },
      documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, select: { id: true } },
    },
  });
  if (!p) return json({ error: "Listing not found." }, 404);

  // Public reviews for this landlord (tenant→landlord, moderated VISIBLE only).
  const [agg, reviews] = await Promise.all([
    prisma.rating.aggregate({
      where: { rateeId: p.landlord.id, direction: "TENANT_TO_LANDLORD", status: "VISIBLE" },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    prisma.rating.findMany({
      where: { rateeId: p.landlord.id, direction: "TENANT_TO_LANDLORD", status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { rater: { select: { fullName: true } } },
    }),
  ]);

  return json({
    listing: {
      id: p.id, ref: p.ref, name: p.name, address: p.address, description: p.description,
      type: p.type, rent: Number(p.rentAmount), securityDeposit: Number(p.securityDeposit),
      maintenanceMonthly: p.maintenanceMonthly != null ? Number(p.maintenanceMonthly) : null,
      rooms: p.rooms, bathrooms: p.bathrooms, balconies: p.balconies, floor: p.floor,
      totalFloors: p.totalFloors, areaSqft: p.areaSqft, carpetAreaSqft: p.carpetAreaSqft,
      furnishing: p.furnishing, facing: p.facing, projectName: p.projectName, listedBy: p.listedBy,
      hasLobby: p.hasLobby, hasParking: p.hasParking, hasLift: p.hasLift, powerBackup: p.powerBackup,
      bachelorsAllowed: p.bachelorsAllowed, parkingSpots: p.parkingSpots,
      amenities: toStrArr(p.amenities),
      available: p.availability === "AVAILABLE",
      verified: p.verified || p.landlord.verified,
      noticePeriodDays: p.noticePeriodDays,
      photos: p.documents.map((d) => `/api/files/${d.id}`),
      landlord: {
        id: p.landlord.id,
        fullName: p.landlord.fullName,
        verified: p.landlord.verified,
        rating: agg._avg.stars != null ? Math.round(agg._avg.stars * 10) / 10 : null,
        ratingCount: agg._count._all,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        stars: r.stars,
        feedback: r.feedback,
        createdAt: r.createdAt,
        by: r.rater.fullName,
      })),
    },
  });
}
