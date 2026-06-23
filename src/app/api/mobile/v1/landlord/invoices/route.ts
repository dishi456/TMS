import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/invoices → invoices across the landlord's leases + KPIs.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const landlordId = user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [collected, pending, overdue, invoices] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd }, invoice: { lease: { landlordId } } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] }, lease: { landlordId } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "OVERDUE", lease: { landlordId } } }),
    prisma.invoice.findMany({
      where: { lease: { landlordId } },
      orderBy: { periodMonth: "desc" },
      take: 100,
      select: {
        id: true, periodMonth: true, amount: true, dueDate: true, status: true,
        lease: { select: { property: { select: { name: true } }, tenant: { select: { fullName: true } } } },
      },
    }),
  ]);

  return json({
    kpis: {
      collectedThisMonth: Number(collected._sum.amount ?? 0),
      pending: Number(pending._sum.amount ?? 0),
      overdue: Number(overdue._sum.amount ?? 0),
    },
    items: invoices.map((i) => ({
      id: i.id,
      periodMonth: i.periodMonth.toISOString(),
      amount: Number(i.amount),
      dueDate: i.dueDate.toISOString(),
      status: i.status,
      property: i.lease.property.name,
      tenant: i.lease.tenant.fullName,
    })),
  });
}
