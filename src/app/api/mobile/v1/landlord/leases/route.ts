import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/leases
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const leases = await prisma.lease.findMany({
    where: { landlordId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, name: true } }, tenant: { select: { id: true, fullName: true, email: true } } },
  });
  return json({
    leases: leases.map((l) => ({
      id: l.id, status: l.status, monthlyRent: Number(l.monthlyRent), securityDeposit: Number(l.securityDeposit),
      startDate: l.startDate, endDate: l.endDate, property: l.property, tenant: l.tenant,
    })),
  });
}
