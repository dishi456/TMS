import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["VISIBLE", "FLAGGED", "REMOVED"]) });

// PATCH /api/mobile/v1/admin/reviews/{id}  { status } -> moderate a rating
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const exists = await prisma.rating.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return json({ error: "Not found." }, 404);
  await prisma.rating.update({ where: { id }, data: { status: parsed.data.status } });
  await audit({
    actorId: user.id,
    action: parsed.data.status === "REMOVED" ? "rating.remove" : parsed.data.status === "FLAGGED" ? "rating.flag" : "rating.restore",
    entity: "Rating", entityId: id,
  });
  return json({ ok: true });
}
