import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownWhere(landlordId: string, id: string) {
  return { id, OR: [{ property: { landlordId } }, { tenant: { landlordId } }] };
}

// GET /api/mobile/v1/landlord/complaints/{id} -> detail + thread
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const c = await prisma.complaint.findFirst({
    where: ownWhere(user.id, id),
    include: {
      property: { select: { id: true, name: true } },
      tenant: { select: { id: true, fullName: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, fullName: true, role: true } } } },
    },
  });
  if (!c) return json({ error: "Not found." }, 404);
  return json({
    complaint: {
      id: c.id, subject: c.subject, description: c.description, status: c.status,
      property: c.property, tenant: c.tenant, createdAt: c.createdAt,
      messages: c.messages.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, author: m.author, mine: m.authorId === user.id })),
    },
  });
}

const schema = z.object({ status: z.enum(["OPEN", "RESPONDED", "RESOLVED", "CLOSED", "REOPENED"]) });

// PATCH /api/mobile/v1/landlord/complaints/{id}  { status }
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const c = await prisma.complaint.findFirst({ where: ownWhere(user.id, id), select: { id: true, tenantId: true } });
  if (!c) return json({ error: "Not found." }, 404);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  await prisma.complaint.update({ where: { id }, data: { status: parsed.data.status } });
  await audit({ actorId: user.id, action: "complaint.status", entity: "Complaint", entityId: id, metadata: { status: parsed.data.status } });
  await notify(c.tenantId, { type: "complaint", title: "Complaint updated", body: `Status: ${parsed.data.status}`, link: "/tenant/complaints" });
  return json({ ok: true });
}
