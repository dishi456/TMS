import { prisma } from "@/lib/prisma";
import { json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/mobile/v1/listings/nearby?lat=&lng=&radius=&q= -> approved public
// listings within `radius` km of the caller's location, nearest first.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const radius = Number(sp.get("radius") || 50);
  const q = sp.get("q")?.trim();
  if (Number.isNaN(lat) || Number.isNaN(lng)) return json({ error: "lat and lng are required." }, 400);

  const where: Record<string, unknown> = { approved: true, listedPublic: true, latitude: { not: null }, longitude: { not: null } };
  if (q) where.OR = [{ name: { contains: q } }, { city: { contains: q } }, { address: { contains: q } }];

  const props = await prisma.property.findMany({
    where,
    include: { documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } } },
    take: 400,
  });

  const items = props
    .map((p) => ({
      id: p.id, ref: p.ref, name: p.name, address: p.address, city: p.city ?? "", type: p.type,
      rent: Number(p.rentAmount), securityDeposit: Number(p.securityDeposit), rooms: p.rooms, bathrooms: p.bathrooms, areaSqft: p.areaSqft,
      furnishing: p.furnishing, amenities: toStrArr(p.amenities), available: p.availability === "AVAILABLE", verified: p.verified,
      listedAt: p.createdAt, photo: p.documents[0] ? `/api/files/${p.documents[0].id}` : null,
      distanceKm: Math.round(haversineKm(lat, lng, p.latitude as number, p.longitude as number) * 10) / 10,
    }))
    .filter((x) => x.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 60);

  return json({ items, total: items.length });
}
