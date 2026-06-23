import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "123 Main St, Brooklyn, NY" → "Brooklyn, NY" (last two segments).
function cityOf(address: string): string {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join(", ") : (parts[0] ?? address);
}

const TYPES = ["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL", "OTHER"];
const FURNISHINGS = ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"];

// GET /api/mobile/v1/listings — public, paginated search.
// Query: q, city, type, minRent, maxRent, bedrooms, furnishing, amenities (csv),
//        sort (newest|rent_asc|rent_desc), page, pageSize.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(sp.get("pageSize") || "20", 10) || 20));

  const q = (sp.get("q") || "").trim();
  const city = (sp.get("city") || "").trim();
  const type = (sp.get("type") || "").toUpperCase();
  const furnishing = (sp.get("furnishing") || "").toUpperCase();
  const minRent = parseFloat(sp.get("minRent") || "");
  const maxRent = parseFloat(sp.get("maxRent") || "");
  const bedrooms = parseInt(sp.get("bedrooms") || "", 10);
  const amenities = (sp.get("amenities") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const sort = sp.get("sort") || "newest";

  // Same visibility rule as the web listings page: approved + public, and either
  // available now or occupied-but-on-notice (freeing up soon).
  const where: Prisma.PropertyWhereInput = {
    approved: true,
    listedPublic: true,
    OR: [
      { availability: "AVAILABLE" },
      { leases: { some: { status: { in: ["ACTIVE", "RENEWED"] }, noticeGivenAt: { not: null } } } },
    ],
  };

  const and: Prisma.PropertyWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { projectName: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (city) and.push({ address: { contains: city, mode: "insensitive" } });
  if (TYPES.includes(type)) and.push({ type: type as Prisma.PropertyWhereInput["type"] });
  if (FURNISHINGS.includes(furnishing)) and.push({ furnishing: furnishing as Prisma.PropertyWhereInput["furnishing"] });
  if (!Number.isNaN(minRent)) and.push({ rentAmount: { gte: minRent } });
  if (!Number.isNaN(maxRent)) and.push({ rentAmount: { lte: maxRent } });
  if (!Number.isNaN(bedrooms)) and.push({ rooms: { gte: bedrooms } });
  if (amenities.length) and.push({ amenities: { hasEvery: amenities } });
  if (and.length) where.AND = and;

  const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
    sort === "rent_asc" ? [{ rentAmount: "asc" }]
    : sort === "rent_desc" ? [{ rentAmount: "desc" }]
    : [{ createdAt: "desc" }];

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
        landlord: { select: { verified: true } },
      },
    }),
  ]);

  const items = properties.map((p) => ({
    id: p.id,
    ref: p.ref,
    name: p.name,
    address: p.address,
    city: cityOf(p.address),
    type: p.type,
    rent: Number(p.rentAmount),
    securityDeposit: Number(p.securityDeposit),
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    areaSqft: p.areaSqft,
    furnishing: p.furnishing,
    amenities: p.amenities,
    available: p.availability === "AVAILABLE",
    verified: p.verified || p.landlord.verified,
    listedAt: p.createdAt.toISOString(),
    photo: p.documents[0] ? `/api/files/${p.documents[0].id}` : null,
  }));

  return json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
}
