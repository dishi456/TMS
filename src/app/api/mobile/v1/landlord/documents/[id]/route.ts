import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ verified: z.boolean() });

// PATCH /api/mobile/v1/landlord/documents/{id} -> verify (or un-verify) a tenant's
// identity document. Allowed only for a landlord who shares a lease with the
// document's owner (their tenant).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);

  const doc = await prisma.document.findUnique({ where: { id }, select: { id: true, ownerId: true, type: true } });
  if (!doc || !["GOVERNMENT_ID", "OTHER"].includes(doc.type)) return json({ error: "Document not found." }, 404);

  const shared = await prisma.lease.findFirst({ where: { landlordId: user.id, tenantId: doc.ownerId }, select: { id: true } });
  if (!shared) return json({ error: "You can only verify documents of your own tenants." }, 403);

  await prisma.document.update({ where: { id }, data: { verified: parsed.data.verified } });
  await audit({ actorId: user.id, action: parsed.data.verified ? "document.verify" : "document.unverify", entity: "Document", entityId: id });
  return json({ ok: true, verified: parsed.data.verified });
}
