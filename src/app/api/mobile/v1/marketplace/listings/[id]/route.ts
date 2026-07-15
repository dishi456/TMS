import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/marketplace/listings/{id} -> full detail + seller
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { id } = await ctx.params;
  const l = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, fullName: true, username: true, avatarUrl: true, verified: true, phone: true, email: true, prefCity: true } },
      _count: { select: { favorites: true } },
    },
  });
  if (!l) return json({ error: "Listing not found." }, 404);
  const fav = await prisma.marketplaceFavorite.findFirst({ where: { userId: user.id, listingId: id }, select: { id: true } });
  // Count this seller's other active listings as a light "seller rating" signal.
  const sellerListings = await prisma.marketplaceListing.count({ where: { sellerId: l.sellerId } });
  return json({
    listing: {
      id: l.id, title: l.title, description: l.description, category: l.category, condition: l.condition,
      price: Number(l.price), currency: l.currency, location: l.location, images: toStrArr(l.images),
      status: l.status, createdAt: l.createdAt, mine: l.sellerId === user.id, favorited: !!fav, favorites: l._count.favorites,
      seller: {
        id: l.seller.id, name: l.seller.username || l.seller.fullName, avatarUrl: l.seller.avatarUrl,
        verified: l.seller.verified, phone: l.seller.phone, email: l.seller.email, city: l.seller.prefCity, listings: sellerListings,
      },
    },
  });
}

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]).optional(),
  price: z.coerce.number().nonnegative().optional(),
  location: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["AVAILABLE", "SOLD"]).optional(),
});

// PATCH /api/mobile/v1/marketplace/listings/{id} -> edit / mark sold (owner only)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { id } = await ctx.params;
  const owns = await prisma.marketplaceListing.findFirst({ where: { id, sellerId: user.id }, select: { id: true } });
  if (!owns) return json({ error: "Not found." }, 404);
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  await prisma.marketplaceListing.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.condition !== undefined ? { condition: d.condition } : {}),
      ...(d.price !== undefined ? { price: d.price } : {}),
      ...(d.location !== undefined ? { location: d.location || null } : {}),
      ...(d.images !== undefined ? { images: d.images } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
    },
  });
  return json({ ok: true });
}

// DELETE /api/mobile/v1/marketplace/listings/{id} -> remove (owner only)
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { id } = await ctx.params;
  const owns = await prisma.marketplaceListing.findFirst({ where: { id, sellerId: user.id }, select: { id: true } });
  if (!owns) return json({ error: "Not found." }, 404);
  await prisma.marketplaceListing.delete({ where: { id } });
  return json({ ok: true });
}
