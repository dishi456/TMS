import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ approved: z.boolean().default(true) });

// POST /api/mobile/v1/admin/properties/{id}/approve { approved } → approve/unapprove.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const approved = parsed.success ? parsed.data.approved : true;

  const property = await prisma.property.findUnique({ where: { id }, select: { id: true, name: true, landlordId: true } });
  if (!property) return error("Property not found.", 404);

  await prisma.property.update({ where: { id }, data: { approved } });
  await audit({ actorId: user.id, action: approved ? "property.approve" : "property.unapprove", entity: "Property", entityId: id });
  if (approved) await notify(property.landlordId, { type: "property", title: "Property approved", body: `${property.name} is now live.`, link: "/landlord/properties" });

  return json({ ok: true });
}
