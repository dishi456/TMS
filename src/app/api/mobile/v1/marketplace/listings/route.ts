import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListingRow = {
  id: string; title: string; description: string | null; category: string; condition: string;
  price: { toString(): string }; currency: string; location: string | null; images: unknown;
  status: string; createdAt: Date; sellerId: string;
  seller: { id: string; fullName: string; username: string | null; avatarUrl: string | null; verified: boolean };
  _count?: { favorites: number };
};

function serialize(l: ListingRow, userId: string, favSet: Set<string>) {
  return {
    id: l.id, title: l.title, description: l.description, category: l.category, condition: l.condition,
    price: Number(l.price), currency: l.currency, location: l.location, images: toStrArr(l.images),
    status: l.status, createdAt: l.createdAt,
    seller: { id: l.seller.id, name: l.seller.username || l.seller.fullName, avatarUrl: l.seller.avatarUrl, verified: l.seller.verified },
    favorited: favSet.has(l.id), favorites: l._count?.favorites ?? 0, mine: l.sellerId === userId,
  };
}

// GET /api/mobile/v1/marketplace/listings?q=&category=&condition=&sort=&scope=
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const category = sp.get("category")?.trim();
  const condition = sp.get("condition")?.trim();
  const sort = sp.get("sort") || "newest";
  const scope = sp.get("scope") || "all"; // all | mine | favorites

  const where: Record<string, unknown> = {};
  if (scope === "mine") where.sellerId = user.id;
  else where.status = "AVAILABLE";
  if (category) where.category = category;
  if (condition) where.condition = condition;
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];

  if (scope === "favorites") {
    const favs = await prisma.marketplaceFavorite.findMany({ where: { userId: user.id }, select: { listingId: true } });
    delete where.status;
    where.id = { in: favs.length ? favs.map((f) => f.listingId) : ["__none__"] };
  }

  const orderBy: any = sort === "price_asc" ? { price: "asc" } : sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };
  const listings = await prisma.marketplaceListing.findMany({
    where, orderBy, take: 100,
    include: { seller: { select: { id: true, fullName: true, username: true, avatarUrl: true, verified: true } }, _count: { select: { favorites: true } } },
  });
  const favs = await prisma.marketplaceFavorite.findMany({ where: { userId: user.id }, select: { listingId: true } });
  const favSet = new Set(favs.map((f) => f.listingId));
  return json({ listings: listings.map((l) => serialize(l as ListingRow, user.id, favSet)) });
}

const createSchema = z.object({
  title: z.string().min(2, "Enter a title."),
  description: z.string().optional(),
  category: z.string().min(1, "Choose a category."),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]).default("GOOD"),
  price: z.coerce.number().nonnegative("Enter a valid price."),
  currency: z.string().default("INR"),
  location: z.string().optional(),
  images: z.array(z.string()).default([]),
});

// POST /api/mobile/v1/marketplace/listings -> create a listing
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  const l = await prisma.marketplaceListing.create({
    data: {
      sellerId: user.id, title: d.title, description: d.description || null, category: d.category,
      condition: d.condition, price: d.price, currency: d.currency, location: d.location || null,
      images: d.images, status: "AVAILABLE",
    },
    select: { id: true },
  });
  return json({ ok: true, id: l.id });
}
