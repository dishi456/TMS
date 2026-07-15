import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/maintenance/{id} -> one request (owned by the tenant)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const { id } = await ctx.params;
  const r = await prisma.maintenanceRequest.findFirst({
    where: { id, tenantId: user.id },
    include: { property: { select: { id: true, name: true, address: true } } },
  });
  if (!r) return json({ error: "Not found." }, 404);
  return json({
    request: {
      id: r.id, title: r.title, description: r.description, priority: r.priority, status: r.status,
      assignedTo: r.assignedTo, images: toStrArr(r.images), property: r.property,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    },
  });
}
