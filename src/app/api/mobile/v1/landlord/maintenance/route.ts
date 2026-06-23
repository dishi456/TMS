import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/maintenance?status= → requests across the landlord's properties.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const status = new URL(req.url).searchParams.get("status") || undefined;

  const items = await prisma.maintenanceRequest.findMany({
    where: { property: { landlordId: user.id }, ...(status ? { status: status as never } : {}) },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true, title: true, status: true, priority: true, assignedTo: true, images: true, createdAt: true,
      property: { select: { name: true } },
      tenant: { select: { fullName: true } },
    },
  });

  return json({
    items: items.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      priority: m.priority,
      assignedTo: m.assignedTo,
      images: m.images,
      createdAt: m.createdAt.toISOString(),
      property: m.property.name,
      tenant: m.tenant.fullName,
    })),
  });
}
