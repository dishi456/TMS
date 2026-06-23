import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["VISIBLE", "FLAGGED", "REMOVED"]) });

// POST /api/mobile/v1/admin/reviews/{id} { status } → moderate a rating.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Invalid status.", 400);

  const rating = await prisma.rating.findUnique({ where: { id }, select: { id: true } });
  if (!rating) return error("Rating not found.", 404);

  await prisma.rating.update({ where: { id }, data: { status: parsed.data.status } });
  const action = parsed.data.status === "REMOVED" ? "rating.remove" : parsed.data.status === "FLAGGED" ? "rating.flag" : "rating.restore";
  await audit({ actorId: user.id, action, entity: "Rating", entityId: id });

  return json({ ok: true });
}
