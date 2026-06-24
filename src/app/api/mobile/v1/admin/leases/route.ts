import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/leases -> all leases
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const leases = await prisma.lease.findMany({
    orderBy: { createdAt: "desc" }, take: 300,
    include: {
      property: { select: { id: true, name: true } },
      landlord: { select: { id: true, fullName: true } },
      tenant: { select: { id: true, fullName: true } },
    },
  });
  return json({
    leases: leases.map((l) => ({
      id: l.id, status: l.status, monthlyRent: Number(l.monthlyRent), startDate: l.startDate, endDate: l.endDate,
      property: l.property, landlord: l.landlord, tenant: l.tenant,
    })),
  });
}
