import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal public card data for a set of property ids (used by the saved list).
// Only returns properties that are still public + approved.
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (ids.length === 0) return Response.json({ items: [] });

  const props = await prisma.property.findMany({
    where: { id: { in: ids }, approved: true, listedPublic: true },
    include: { documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" } } },
  });

  const items = props.map((p) => ({
    id: p.id,
    ref: p.ref,
    name: p.name,
    address: p.address,
    type: p.type,
    rent: Number(p.rentAmount),
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    areaSqft: p.areaSqft,
    available: p.availability === "AVAILABLE",
    photoId: p.documents[0]?.id ?? null,
  }));

  return Response.json({ items });
}
