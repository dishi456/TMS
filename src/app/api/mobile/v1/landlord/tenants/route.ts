import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/tenants → the landlord's managed tenants.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  const tenants = await prisma.user.findMany({
    where: { role: "TENANT", landlordId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, fullName: true, email: true, phone: true, status: true, verified: true, avatarUrl: true,
      tenantLeases: {
        where: { status: { in: ["ACTIVE", "RENEWED"] } },
        select: { property: { select: { name: true } } },
        take: 1,
      },
    },
  });

  return json({
    items: tenants.map((t) => ({
      id: t.id,
      fullName: t.fullName,
      email: t.email,
      phone: t.phone,
      status: t.status,
      verified: t.verified,
      property: t.tenantLeases[0]?.property.name ?? null,
    })),
  });
}
