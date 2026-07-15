import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { propertyWriteSchema, toPropertyData } from "@/lib/mobile-property";
import { toStrArr } from "@/lib/json";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/properties/{id} -> full detail (owned)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const p = await prisma.property.findFirst({
    where: { id, landlordId: user.id },
    include: { documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, select: { id: true } } },
  });
  if (!p) return json({ error: "Not found." }, 404);
  return json({
    property: {
      ...p,
      rentAmount: Number(p.rentAmount), securityDeposit: Number(p.securityDeposit),
      maintenanceMonthly: p.maintenanceMonthly != null ? Number(p.maintenanceMonthly) : null,
      amenities: toStrArr(p.amenities),
      photos: p.documents.map((d) => `/api/files/${d.id}`),
    },
  });
}

// PATCH /api/mobile/v1/landlord/properties/{id} -> update (owned)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const owns = await prisma.property.findFirst({ where: { id, landlordId: user.id }, select: { id: true } });
  if (!owns) return json({ error: "Not found." }, 404);
  const parsed = propertyWriteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  await prisma.property.update({ where: { id }, data: toPropertyData(parsed.data) });
  await audit({ actorId: user.id, action: "property.update", entity: "Property", entityId: id });
  return json({ ok: true });
}
