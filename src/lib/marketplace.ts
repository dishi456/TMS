import { prisma } from "@/lib/prisma";
import { toStrArr } from "@/lib/json";

export const CATEGORIES = ["Furniture", "Appliances", "Electronics", "Home & Kitchen", "Decor", "Books", "Sports", "Vehicles", "Other"] as const;
export const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
] as const;

export function conditionLabel(c: string): string {
  return CONDITIONS.find((x) => x.value === c)?.label ?? c;
}

// Price in the listing's own currency (marketplace is multi-currency, unlike the
// USD-only rent dashboards).
export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export type MarketScope = "all" | "mine" | "favorites";

export type ListingCard = {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  currency: string;
  location: string | null;
  image: string | null;
  status: string;
  createdAt: Date;
  sellerName: string;
  favorited: boolean;
  favorites: number;
  mine: boolean;
};

export async function listMarketplace(
  userId: string,
  params: { q?: string; category?: string; condition?: string; sort?: string; scope?: MarketScope },
): Promise<ListingCard[]> {
  const { q, category, condition, sort = "newest", scope = "all" } = params;

  const where: Record<string, unknown> = {};
  if (scope === "mine") where.sellerId = userId;
  else where.status = "AVAILABLE";
  if (category) where.category = category;
  if (condition) where.condition = condition;
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];

  if (scope === "favorites") {
    const favs = await prisma.marketplaceFavorite.findMany({ where: { userId }, select: { listingId: true } });
    delete where.status;
    where.id = { in: favs.length ? favs.map((f) => f.listingId) : ["__none__"] };
  }

  const orderBy = sort === "price_asc" ? { price: "asc" as const } : sort === "price_desc" ? { price: "desc" as const } : { createdAt: "desc" as const };
  const listings = await prisma.marketplaceListing.findMany({
    where,
    orderBy,
    take: 120,
    include: {
      seller: { select: { fullName: true, username: true } },
      _count: { select: { favorites: true } },
    },
  });
  const favs = await prisma.marketplaceFavorite.findMany({ where: { userId }, select: { listingId: true } });
  const favSet = new Set(favs.map((f) => f.listingId));

  return listings.map((l) => {
    const images = toStrArr(l.images);
    return {
      id: l.id,
      title: l.title,
      category: l.category,
      condition: l.condition,
      price: Number(l.price),
      currency: l.currency,
      location: l.location,
      image: images[0] ?? null,
      status: l.status,
      createdAt: l.createdAt,
      sellerName: l.seller.username || l.seller.fullName,
      favorited: favSet.has(l.id),
      favorites: l._count.favorites,
      mine: l.sellerId === userId,
    };
  });
}

export async function getMarketplaceListing(id: string, userId: string) {
  const l = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, fullName: true, username: true, avatarUrl: true, verified: true, phone: true, email: true, prefCity: true } },
      _count: { select: { favorites: true } },
    },
  });
  if (!l) return null;
  const fav = await prisma.marketplaceFavorite.findFirst({ where: { userId, listingId: id }, select: { id: true } });
  const sellerListings = await prisma.marketplaceListing.count({ where: { sellerId: l.sellerId } });
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    category: l.category,
    condition: l.condition,
    price: Number(l.price),
    currency: l.currency,
    location: l.location,
    images: toStrArr(l.images),
    status: l.status,
    createdAt: l.createdAt,
    mine: l.sellerId === userId,
    favorited: !!fav,
    favorites: l._count.favorites,
    seller: {
      id: l.seller.id,
      name: l.seller.username || l.seller.fullName,
      avatarUrl: l.seller.avatarUrl,
      verified: l.seller.verified,
      phone: l.seller.phone,
      email: l.seller.email,
      city: l.seller.prefCity,
      listings: sellerListings,
    },
  };
}
