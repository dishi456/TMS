import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/landlord/complaints/{id}/messages  { body } -> reply
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const c = await prisma.complaint.findFirst({
    where: { id, OR: [{ property: { landlordId: user.id } }, { tenant: { landlordId: user.id } }] },
    select: { id: true, tenantId: true },
  });
  if (!c) return json({ error: "Not found." }, 404);
  const { body } = await req.json().catch(() => ({}));
  const text = String(body ?? "").trim();
  if (!text) return json({ error: "Message is empty." }, 400);

  const msg = await prisma.complaintMessage.create({ data: { complaintId: id, authorId: user.id, body: text.slice(0, 2000) } });
  await prisma.complaint.update({ where: { id }, data: { status: "RESPONDED" } });
  await notify(c.tenantId, { type: "complaint", title: "Reply to your complaint", body: text.slice(0, 80), link: "/tenant/complaints" });
  return json({ ok: true, id: msg.id, createdAt: msg.createdAt });
}
