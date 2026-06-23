import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET detail + thread (landlord side).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const c = await prisma.complaint.findFirst({
    where: { id, property: { landlordId: user.id } },
    select: {
      id: true, subject: true, description: true, status: true, createdAt: true,
      property: { select: { name: true } }, tenant: { select: { fullName: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, authorId: true, createdAt: true } },
    },
  });
  if (!c) return error("Not found", 404);
  return json({
    id: c.id, subject: c.subject, description: c.description, status: c.status, createdAt: c.createdAt.toISOString(),
    property: c.property?.name ?? null, tenant: c.tenant.fullName,
    messages: c.messages.map((m) => ({ id: m.id, body: m.body, mine: m.authorId === user.id, createdAt: m.createdAt.toISOString() })),
  });
}

const schema = z.object({
  body: z.string().optional(),
  status: z.enum(["OPEN", "RESPONDED", "RESOLVED", "CLOSED", "REOPENED"]).optional(),
});

// POST → respond (adds a message, sets RESPONDED) and/or change status.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Invalid request.", 400);
  const d = parsed.data;

  const c = await prisma.complaint.findFirst({ where: { id, property: { landlordId: user.id } }, select: { id: true, tenantId: true } });
  if (!c) return error("Not found", 404);

  const body = (d.body ?? "").trim();
  if (body) {
    await prisma.complaintMessage.create({ data: { complaintId: id, authorId: user.id, body: body.slice(0, 2000) } });
    await prisma.complaint.update({ where: { id }, data: { status: d.status ?? "RESPONDED" } });
    await notify(c.tenantId, { type: "complaint_response", title: "New response to your complaint", link: `/tenant/complaints/${id}` });
  } else if (d.status) {
    await prisma.complaint.update({ where: { id }, data: { status: d.status } });
    await notify(c.tenantId, { type: "complaint", title: `Complaint ${d.status}`, link: `/tenant/complaints/${id}` });
  } else {
    return error("Nothing to update.", 400);
  }
  await audit({ actorId: user.id, action: "complaint.update", entity: "Complaint", entityId: id });
  return json({ ok: true });
}
