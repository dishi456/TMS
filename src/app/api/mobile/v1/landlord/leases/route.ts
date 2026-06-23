import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/leases → the landlord's leases.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  const leases = await prisma.lease.findMany({
    where: { landlordId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, monthlyRent: true, startDate: true, endDate: true,
      property: { select: { name: true } },
      tenant: { select: { fullName: true } },
    },
  });

  return json({
    items: leases.map((l) => ({
      id: l.id,
      status: l.status,
      monthlyRent: Number(l.monthlyRent),
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      property: l.property.name,
      tenant: l.tenant.fullName,
    })),
  });
}
