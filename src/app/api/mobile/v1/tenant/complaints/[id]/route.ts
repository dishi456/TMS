import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/complaints/{id} -> complaint + message thread
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const { id } = await ctx.params;
  const c = await prisma.complaint.findFirst({
    where: { id, tenantId: user.id },
    include: {
      property: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, fullName: true, role: true } } },
      },
    },
  });
  if (!c) return json({ error: "Not found." }, 404);
  return json({
    complaint: {
      id: c.id, subject: c.subject, description: c.description, status: c.status,
      property: c.property, createdAt: c.createdAt,
      messages: c.messages.map((m) => ({
        id: m.id, body: m.body, createdAt: m.createdAt,
        author: m.author, mine: m.authorId === user.id,
      })),
    },
  });
}
