import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/maintenance -> all maintenance requests
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const items = await prisma.maintenanceRequest.findMany({
    orderBy: { createdAt: "desc" }, take: 300,
    include: {
      property: { select: { id: true, name: true, landlord: { select: { id: true, fullName: true } } } },
      tenant: { select: { id: true, fullName: true } },
    },
  });
  return json({
    requests: items.map((r) => ({
      id: r.id, title: r.title, priority: r.priority, status: r.status, images: toStrArr(r.images),
      property: { id: r.property.id, name: r.property.name }, landlord: r.property.landlord, tenant: r.tenant, createdAt: r.createdAt,
    })),
  });
}
