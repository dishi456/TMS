import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/account/visits → the signed-in seeker's visit requests.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["USER", "TENANT"]);
  if (user instanceof Response) return user;

  const visits = await prisma.visit.findMany({
    where: { email: user.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true, ref: true } } },
  });

  return json({
    items: visits.map((v) => ({
      id: v.id,
      status: v.status,
      preferredAt: v.preferredAt,
      message: v.message,
      createdAt: v.createdAt,
      property: v.property.name,
      ref: v.property.ref,
    })),
  });
}

// POST /api/mobile/v1/account/visits → book a property tour.
// Mirrors the website's requestVisit (src/app/listings/actions.ts).
const schema = z.object({
  propertyId: z.string().min(1, "Missing property."),
  preferredAt: z.string().min(1, "Pick a preferred date & time."),
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

  const when = new Date(d.preferredAt);
  if (Number.isNaN(when.getTime())) return error("Invalid date & time.");
  if (when.getTime() < Date.now()) return error("Pick a future date & time.");

  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, approved: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return error("This property is not available for visits.", 404);

  const visit = await prisma.visit.create({
    data: {
      propertyId: property.id,
      fullName: user.fullName,
      email: user.email.toLowerCase(),
      phone: user.phone || null,
      preferredAt: when,
      message: d.message || null,
      status: "PENDING",
    },
    select: { id: true },
  });

  const whenStr = when.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  await notify(property.landlordId, {
    type: "visit",
    title: "New visit request",
    body: `${user.fullName} wants to tour ${property.name} on ${whenStr}.`,
    link: "/landlord/visits",
  });
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: "visit", title: "New visit request", body: `${user.fullName} requested a tour of ${property.name}.` });
  }

  return json({ ok: true, id: visit.id });
}
