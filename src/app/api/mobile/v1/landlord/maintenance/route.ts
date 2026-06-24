import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { toStrArr } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/maintenance -> requests across this landlord's properties
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const items = await prisma.maintenanceRequest.findMany({
    where: { property: { landlordId: user.id } },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, name: true } }, tenant: { select: { id: true, fullName: true } } },
  });
  return json({
    requests: items.map((r) => ({
      id: r.id, title: r.title, description: r.description, priority: r.priority, status: r.status,
      assignedTo: r.assignedTo, images: toStrArr(r.images), property: r.property, tenant: r.tenant, createdAt: r.createdAt,
    })),
  });
}
