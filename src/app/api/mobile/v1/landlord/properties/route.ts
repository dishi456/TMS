import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { propertyWriteSchema, toPropertyData, serializeCard } from "@/lib/mobile-property";
import { generatePropertyRef } from "@/lib/property-ref";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/properties -> this landlord's properties
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const props = await prisma.property.findMany({
    where: { landlordId: user.id },
    orderBy: { createdAt: "desc" },
    include: { documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } } },
  });
  return json({ properties: props.map(serializeCard) });
}

// POST /api/mobile/v1/landlord/properties -> create a property (awaits admin approval)
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  // A landlord must set their unique user ID (username) before adding properties.
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { username: true } });
  if (!me?.username) return json({ error: "Set your unique user ID (username) on your profile before adding a property." }, 400);
  const parsed = propertyWriteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);

  const created = await prisma.property.create({
    data: { ...toPropertyData(parsed.data), ref: await generatePropertyRef(), landlordId: user.id, approved: false },
  });
  await audit({ actorId: user.id, action: "property.create", entity: "Property", entityId: created.id });
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: "property", title: "New property pending approval", body: created.name, link: `/master-admin/properties/${created.id}` });
  }
  return json({ ok: true, id: created.id });
}
