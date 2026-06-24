import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/account/applications -> the signed-in seeker's rental applications.
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, ["USER", "TENANT"]);
  if (res) return res;
  const apps = await prisma.application.findMany({
    where: { email: user.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true, ref: true } } },
  });
  return json({
    items: apps.map((a) => ({
      id: a.id, status: a.status, message: a.message, createdAt: a.createdAt,
      property: a.property.name, ref: a.property.ref,
    })),
  });
}

// POST { propertyId, message? } -> apply to rent. Mirrors web submitApplication.
const schema = z.object({
  propertyId: z.string().min(1, "Missing property."),
  message: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, ["USER", "TENANT"]);
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, approved: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return json({ error: "This property is not available for applications." }, 404);

  const existing = await prisma.application.findFirst({
    where: { propertyId: property.id, email: user.email.toLowerCase(), status: "PENDING" },
    select: { id: true },
  });
  if (existing) return json({ error: "You've already applied to this property." }, 409);

  const app = await prisma.application.create({
    data: {
      propertyId: property.id,
      fullName: user.fullName,
      email: user.email.toLowerCase(),
      phone: user.phone || null,
      message: d.message || null,
      status: "PENDING",
    },
    select: { id: true },
  });

  await notify(property.landlordId, {
    type: "application",
    title: "New rental application",
    body: `${user.fullName} applied for ${property.name}.`,
    link: "/landlord/applications",
  });
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: "application", title: "New rental application", body: `${user.fullName} applied for ${property.name}.` });
  }

  return json({ ok: true, id: app.id });
}
