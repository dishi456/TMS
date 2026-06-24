import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/payments -> all payments
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" }, take: 300,
    include: {
      tenant: { select: { id: true, fullName: true } },
      invoice: { select: { id: true, periodMonth: true, lease: { select: { property: { select: { name: true } } } } } },
    },
  });
  return json({
    payments: payments.map((p) => ({
      id: p.id, amount: Number(p.amount), method: p.method, status: p.status, verified: p.verified,
      paidAt: p.paidAt, createdAt: p.createdAt, tenant: p.tenant,
      property: p.invoice.lease.property.name, periodMonth: p.invoice.periodMonth,
    })),
  });
}
