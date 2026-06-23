import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/tenant/complaints/{id}/messages { body } → reply.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;

  const parsed = z.object({ body: z.string().min(1) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Message body is required.", 400);

  const complaint = await prisma.complaint.findFirst({ where: { id, tenantId: user.id }, select: { id: true } });
  if (!complaint) return error("Not found", 404);

  const msg = await prisma.complaintMessage.create({
    data: { complaintId: id, authorId: user.id, body: parsed.data.body.trim().slice(0, 2000) },
  });

  return json({ id: msg.id, createdAt: msg.createdAt.toISOString() }, 201);
}
