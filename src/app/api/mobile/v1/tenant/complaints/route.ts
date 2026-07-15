import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/complaints -> list
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const items = await prisma.complaint.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, name: true } }, _count: { select: { messages: true } } },
  });
  return json({
    complaints: items.map((c) => ({
      id: c.id, subject: c.subject, description: c.description, status: c.status,
      property: c.property, messageCount: c._count.messages, createdAt: c.createdAt,
    })),
  });
}

const schema = z.object({
  subject: z.string().min(3, "Enter a subject."),
  description: z.string().min(5, "Describe your complaint."),
  propertyId: z.string().optional(),
});

// POST /api/mobile/v1/tenant/complaints  { subject, description, propertyId? }
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  let propertyId: string | null = null;
  if (d.propertyId) {
    const lease = await prisma.lease.findFirst({ where: { tenantId: user.id, propertyId: d.propertyId } });
    if (!lease) return json({ error: "You don't have a lease on that property." }, 400);
    propertyId = d.propertyId;
  }

  const complaint = await prisma.complaint.create({
    data: { tenantId: user.id, propertyId, subject: d.subject, description: d.description, status: "OPEN" },
  });
  await audit({ actorId: user.id, action: "complaint.submit", entity: "Complaint", entityId: complaint.id });

  let landlordId: string | null | undefined;
  if (propertyId) {
    landlordId = (await prisma.property.findUnique({ where: { id: propertyId }, select: { landlordId: true } }))?.landlordId;
  } else {
    landlordId = (await prisma.user.findUnique({ where: { id: user.id }, select: { landlordId: true } }))?.landlordId;
  }
  await notify(landlordId, { type: "complaint", title: "New complaint submitted", body: d.subject, link: `/landlord/complaints/${complaint.id}` });

  return json({ ok: true, id: complaint.id });
}
