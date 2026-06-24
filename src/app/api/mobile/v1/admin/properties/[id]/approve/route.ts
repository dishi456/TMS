import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ approved: z.boolean().default(true) });

// POST /api/mobile/v1/admin/properties/{id}/approve  { approved } -> approve/unapprove a property
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const prop = await prisma.property.findUnique({ where: { id }, select: { id: true, name: true, landlordId: true } });
  if (!prop) return json({ error: "Not found." }, 404);
  await prisma.property.update({ where: { id }, data: { approved: parsed.data.approved } });
  await audit({ actorId: user.id, action: parsed.data.approved ? "property.approve" : "property.unapprove", entity: "Property", entityId: id });
  if (parsed.data.approved) {
    await notify(prop.landlordId, { type: "property", title: "Property approved", body: `${prop.name} is now live.`, link: `/landlord/properties/${id}` });
  }
  return json({ ok: true });
}
