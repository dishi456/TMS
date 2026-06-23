import { prisma } from "@/lib/prisma";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/maintenance/{id} → request detail.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;

  const m = await prisma.maintenanceRequest.findFirst({
    where: { id, tenantId: user.id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      images: true,
      assignedTo: true,
      createdAt: true,
      updatedAt: true,
      property: { select: { id: true, name: true, address: true } },
    },
  });
  if (!m) return error("Not found", 404);

  return json({
    id: m.id,
    title: m.title,
    description: m.description,
    status: m.status,
    priority: m.priority,
    images: m.images,
    assignedTo: m.assignedTo,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    property: m.property,
  });
}
