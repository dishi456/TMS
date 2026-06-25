import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/marketplace/favorites/{listingId} -> add to wishlist
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { id } = await ctx.params;
  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { id: true } });
  if (!listing) return json({ error: "Listing not found." }, 404);
  await prisma.marketplaceFavorite.upsert({
    where: { userId_listingId: { userId: user.id, listingId: id } },
    update: {},
    create: { userId: user.id, listingId: id },
  });
  return json({ ok: true, favorited: true });
}

// DELETE /api/mobile/v1/marketplace/favorites/{listingId} -> remove from wishlist
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { id } = await ctx.params;
  await prisma.marketplaceFavorite.deleteMany({ where: { userId: user.id, listingId: id } });
  return json({ ok: true, favorited: false });
}
