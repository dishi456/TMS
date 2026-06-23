import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["SUCCESS", "PENDING", "FAILED", "REFUNDED"];

// GET /api/mobile/v1/admin/payments?status= → payments + KPIs.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;
  const status = (new URL(req.url).searchParams.get("status") || "").toUpperCase();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const where: Prisma.PaymentWhereInput = STATUSES.includes(status) ? { status: status as Prisma.PaymentWhereInput["status"] } : {};

  const [total, thisMonth, pendingRent, refunded, payments] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "REFUNDED" } }),
    prisma.payment.findMany({
      where, orderBy: { createdAt: "desc" }, take: 100,
      select: {
        id: true, amount: true, method: true, status: true, paidAt: true, createdAt: true,
        tenant: { select: { fullName: true } },
        invoice: { select: { lease: { select: { property: { select: { name: true } } } } } },
      },
    }),
  ]);

  return json({
    kpis: {
      totalCollected: Number(total._sum.amount ?? 0),
      thisMonth: Number(thisMonth._sum.amount ?? 0),
      outstanding: Number(pendingRent._sum.amount ?? 0),
      refunded: Number(refunded._sum.amount ?? 0),
    },
    items: payments.map((p) => ({
      id: p.id, amount: Number(p.amount), method: p.method, status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
      tenant: p.tenant.fullName, property: p.invoice.lease.property.name,
    })),
  });
}
