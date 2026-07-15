import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ verified: z.boolean() });

// POST /api/mobile/v1/admin/users/{id}/verify  { verified } -> verify/unverify a tenant
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  await prisma.user.update({ where: { id }, data: { verified: parsed.data.verified } });
  await audit({ actorId: user.id, action: parsed.data.verified ? "user.verify" : "user.unverify", entity: "User", entityId: id });
  return json({ ok: true });
}
