import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/complaints → the tenant's complaints.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const items = await prisma.complaint.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, subject: true, status: true, createdAt: true },
  });

  return json({ items: items.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })) });
}

const schema = z.object({
  subject: z.string().min(3, "Enter a subject."),
  description: z.string().min(5, "Describe your complaint."),
  propertyId: z.string().optional(),
});

// POST /api/mobile/v1/tenant/complaints → file a complaint.
export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  let propertyId: string | null = null;
  if (d.propertyId) {
    const lease = await prisma.lease.findFirst({ where: { tenantId: user.id, propertyId: d.propertyId } });
    if (!lease) return error("You don't have a lease on that property.", 403);
    propertyId = d.propertyId;
  }

  const complaint = await prisma.complaint.create({
    data: { tenantId: user.id, propertyId, subject: d.subject, description: d.description, status: "OPEN" },
  });
  await audit({ actorId: user.id, action: "complaint.submit", entity: "Complaint", entityId: complaint.id });

  let landlordId: string | null | undefined;
  if (propertyId) {
    const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { landlordId: true } });
    landlordId = prop?.landlordId;
  } else {
    landlordId = (await prisma.user.findUnique({ where: { id: user.id }, select: { landlordId: true } }))?.landlordId;
  }
  await notify(landlordId, {
    type: "complaint",
    title: "New complaint submitted",
    body: d.subject,
    link: `/landlord/complaints/${complaint.id}`,
  });

  return json({ id: complaint.id }, 201);
}
