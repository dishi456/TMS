import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/account/applications → the signed-in seeker's applications.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["USER", "TENANT"]);
  if (user instanceof Response) return user;

  const apps = await prisma.application.findMany({
    where: { email: user.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true, ref: true } } },
  });

  return json({
    items: apps.map((a) => ({
      id: a.id,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt,
      property: a.property.name,
      ref: a.property.ref,
    })),
  });
}

// POST /api/mobile/v1/account/applications → apply to rent a property.
// Mirrors the website's submitApplication (src/app/listings/actions.ts).
const schema = z.object({
  propertyId: z.string().min(1, "Missing property."),
  message: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["USER", "TENANT"]);
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message);
  const d = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, approved: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return error("This property is not available for applications.", 404);

  // Block duplicate pending applications from the same seeker.
  const existing = await prisma.application.findFirst({
    where: { propertyId: property.id, email: user.email.toLowerCase(), status: "PENDING" },
    select: { id: true },
  });
  if (existing) return error("You've already applied to this property.", 409);

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
