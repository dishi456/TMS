import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/complaints → complaints on the landlord's properties.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  const items = await prisma.complaint.findMany({
    where: { property: { landlordId: user.id } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, subject: true, status: true, createdAt: true,
      property: { select: { name: true } }, tenant: { select: { fullName: true } },
    },
  });

  return json({
    items: items.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      property: c.property?.name ?? null,
      tenant: c.tenant.fullName,
    })),
  });
}
