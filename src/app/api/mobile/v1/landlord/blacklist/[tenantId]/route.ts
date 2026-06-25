import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/mobile/v1/landlord/blacklist/{tenantId} -> remove from blacklist
export async function DELETE(req: Request, ctx: { params: Promise<{ tenantId: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { tenantId } = await ctx.params;
  await prisma.blacklist.deleteMany({ where: { landlordId: user.id, tenantId } });
  await audit({ actorId: user.id, action: "tenant.unblacklist", entity: "User", entityId: tenantId });
  return json({ ok: true });
}
