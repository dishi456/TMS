import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  verified: z.boolean().optional(),
});

// POST /api/mobile/v1/admin/users/{id} → set status (approve/suspend) and/or verified.
// Also used to approve a pending landlord (status → ACTIVE).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Invalid request.", 400);
  const d = parsed.data;
  if (d.status === undefined && d.verified === undefined) return error("Nothing to update.", 400);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return error("User not found.", 404);

  await prisma.user.update({
    where: { id },
    data: { ...(d.status ? { status: d.status } : {}), ...(d.verified !== undefined ? { verified: d.verified } : {}) },
  });

  if (d.status) {
    await audit({ actorId: user.id, action: d.status === "SUSPENDED" ? "user.suspend" : "user.activate", entity: "User", entityId: id });
    if (d.status === "ACTIVE") await notify(id, { type: "account", title: "Your account was approved", body: "You now have full access.", link: "/" });
  }
  if (d.verified !== undefined) {
    await audit({ actorId: user.id, action: d.verified ? "user.verify" : "user.unverify", entity: "User", entityId: id });
  }

  return json({ ok: true });
}
