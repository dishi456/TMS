import { prisma } from "@/lib/prisma";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/complaints/{id} → detail + message thread.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;

  const c = await prisma.complaint.findFirst({
    where: { id, tenantId: user.id },
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      property: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, authorId: true, createdAt: true },
      },
    },
  });
  if (!c) return error("Not found", 404);

  return json({
    id: c.id,
    subject: c.subject,
    description: c.description,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    property: c.property,
    messages: c.messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorId: m.authorId,
      mine: m.authorId === user.id,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
