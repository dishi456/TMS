import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]) });

// POST /api/mobile/v1/admin/users/{id}/status  { status } -> activate / suspend / set pending
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  await prisma.user.update({ where: { id }, data: { status: parsed.data.status } });
  await audit({ actorId: user.id, action: parsed.data.status === "SUSPENDED" ? "user.suspend" : "user.activate", entity: "User", entityId: id });
  if (parsed.data.status === "ACTIVE") {
    await notify(id, { type: "account", title: "Account approved", body: "Your account has been approved.", link: "/" });
  }
  return json({ ok: true });
}
