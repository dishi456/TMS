import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/tenant/complaints/{id}/messages  { body } -> reply to a complaint
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const { id } = await ctx.params;
  const { body } = await req.json().catch(() => ({}));
  const text = String(body ?? "").trim();
  if (!text) return json({ error: "Message is empty." }, 400);

  const owns = await prisma.complaint.findFirst({ where: { id, tenantId: user.id }, select: { id: true } });
  if (!owns) return json({ error: "Not found." }, 404);

  const msg = await prisma.complaintMessage.create({
    data: { complaintId: id, authorId: user.id, body: text.slice(0, 2000) },
  });
  return json({ ok: true, id: msg.id, createdAt: msg.createdAt });
}
