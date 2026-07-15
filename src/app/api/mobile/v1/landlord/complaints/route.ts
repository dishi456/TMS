import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/complaints -> complaints from this landlord's tenants/properties
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const items = await prisma.complaint.findMany({
    where: { OR: [{ property: { landlordId: user.id } }, { tenant: { landlordId: user.id } }] },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { id: true, name: true } },
      tenant: { select: { id: true, fullName: true } },
      _count: { select: { messages: true } },
    },
  });
  return json({
    complaints: items.map((c) => ({
      id: c.id, subject: c.subject, description: c.description, status: c.status,
      property: c.property, tenant: c.tenant, messageCount: c._count.messages, createdAt: c.createdAt,
    })),
  });
}
