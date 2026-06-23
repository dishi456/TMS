import { prisma } from "@/lib/prisma";
import { json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/listings/{idOrRef} — public full detail.
// Accepts either the internal cuid or the public 6-digit ref code.
export async function GET(_req: Request, ctx: { params: Promise<{ idOrRef: string }> }) {
  const { idOrRef } = await ctx.params;

  const p = await prisma.property.findFirst({
    where: {
      approved: true,
      listedPublic: true,
      OR: [{ id: idOrRef }, { ref: idOrRef }],
    },
    include: {
      documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, select: { id: true } },
      landlord: { select: { fullName: true, verified: true } },
    },
  });
  if (!p) return error("Listing not found.", 404);

  return json({
    id: p.id,
    ref: p.ref,
    name: p.name,
    type: p.type,
    address: p.address,
    description: p.description,
    rent: Number(p.rentAmount),
    securityDeposit: Number(p.securityDeposit),
    maintenanceMonthly: p.maintenanceMonthly != null ? Number(p.maintenanceMonthly) : null,
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    balconies: p.balconies,
    floor: p.floor,
    totalFloors: p.totalFloors,
    areaSqft: p.areaSqft,
    carpetAreaSqft: p.carpetAreaSqft,
    furnishing: p.furnishing,
    facing: p.facing,
    bachelorsAllowed: p.bachelorsAllowed,
    projectName: p.projectName,
    parkingSpots: p.parkingSpots,
    listedBy: p.listedBy,
    hasLobby: p.hasLobby,
    hasParking: p.hasParking,
    hasLift: p.hasLift,
    powerBackup: p.powerBackup,
    amenities: p.amenities,
    availability: p.availability,
    photos: p.documents.map((d) => `/api/files/${d.id}`),
    landlord: { name: p.landlord.fullName, verified: p.verified || p.landlord.verified },
  });
}
