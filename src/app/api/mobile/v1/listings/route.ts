import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/listings -> public, paginated property search.
// Query: q, type, minRent, maxRent, bedrooms, furnishing, sort, page, pageSize
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const type = sp.get("type")?.trim();
  const furnishing = sp.get("furnishing")?.trim();
  const minRent = Number(sp.get("minRent"));
  const maxRent = Number(sp.get("maxRent"));
  const bedrooms = Number(sp.get("bedrooms"));
  const sort = sp.get("sort") || "newest";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize")) || 20));

  const where: Prisma.PropertyWhereInput = {
    approved: true,
    listedPublic: true,
    ...(q ? { OR: [{ name: { contains: q } }, { address: { contains: q } }] } : {}),
    ...(type ? { type: type as Prisma.PropertyWhereInput["type"] } : {}),
    ...(furnishing ? { furnishing: furnishing as Prisma.PropertyWhereInput["furnishing"] } : {}),
    ...(Number.isFinite(minRent) && minRent > 0 ? { rentAmount: { gte: minRent } } : {}),
    ...(Number.isFinite(maxRent) && maxRent > 0 ? { rentAmount: { lte: maxRent } } : {}),
    ...(Number.isFinite(bedrooms) && bedrooms > 0 ? { rooms: { gte: bedrooms } } : {}),
  };

  const orderBy: Prisma.PropertyOrderByWithRelationInput =
    sort === "rent_asc" ? { rentAmount: "asc" } : sort === "rent_desc" ? { rentAmount: "desc" } : { createdAt: "desc" };

  const [total, props] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where, orderBy, skip: (page - 1) * pageSize, take: pageSize,
      include: {
        landlord: { select: { verified: true } },
        documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
      },
    }),
  ]);

  const items = props.map((p) => ({
    id: p.id, ref: p.ref, name: p.name, address: p.address, type: p.type,
    rent: Number(p.rentAmount), rooms: p.rooms, bathrooms: p.bathrooms, areaSqft: p.areaSqft,
    furnishing: p.furnishing, amenities: toStrArr(p.amenities),
    hasParking: p.hasParking, hasLift: p.hasLift, powerBackup: p.powerBackup,
    available: p.availability === "AVAILABLE",
    verified: p.verified || p.landlord.verified,
    photo: p.documents[0] ? `/api/files/${p.documents[0].id}` : null,
    listedAt: p.createdAt,
  }));

  return json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
