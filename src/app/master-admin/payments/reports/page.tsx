import { prisma } from "@/lib/prisma";
import { Card, btn } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { PaymentsTabs, titleCase } from "../PaymentsTabs";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [collected, month, pending, refunded, txnCount, byMethod, byInvoiceStatus] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "REFUNDED" } }),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.payment.groupBy({ by: ["method"], where: { status: "SUCCESS" }, _sum: { amount: true }, _count: true }),
    prisma.invoice.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
  ]);

  // Last 6 months of collected revenue (for the trend chart).
  const months = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
    return { label: start.toLocaleDateString("en-US", { month: "short" }), start, end };
  });
  const monthlySums = await Promise.all(
    months.map((m) =>
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: m.start, lt: m.end } } }),
    ),
  );
  const trend = months.map((m, i) => ({ label: m.label, amount: Number(monthlySums[i]._sum.amount ?? 0) }));
  const maxTrend = Math.max(1, ...trend.map((t) => t.amount));

  // Overdue aging buckets.
  const overdueInvoices = await prisma.invoice.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: now } },
    select: { amount: true, dueDate: true },
  });
  const aging = { d0_30: 0, d31_60: 0, d61: 0 };
  for (const inv of overdueInvoices) {
    const days = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000);
    const amt = Number(inv.amount);
    if (days <= 30) aging.d0_30 += amt;
    else if (days <= 60) aging.d31_60 += amt;
    else aging.d61 += amt;
  }

  return (
    <div className="space-y-4">
      <PaymentsTabs active="reports" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Financial Report</h2>
        <a href="/master-admin/payments/export" className={btn("primary")}>
          ⬇ Download CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Total Collected" value={formatMoney(collected._sum.amount)} hint={`${formatNumber(txnCount)} payments`} />
        <StatCard tone="light" label="This Month" value={formatMoney(month._sum.amount)} />
        <StatCard tone="light" label="Outstanding" value={formatMoney(pending._sum.amount)} hint="pending + overdue" />
        <StatCard tone="light" label="Refunded" value={formatMoney(refunded._sum.amount)} />
      </div>

      {/* Revenue trend (last 6 months) */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Revenue — last 6 months</h3>
        <Card>
          <div className="flex h-44 items-end justify-between gap-3">
            {trend.map((t) => (
              <div key={t.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{t.amount > 0 ? formatMoney(t.amount) : ""}</span>
                <div
                  className="w-full rounded-t-md bg-blue-500"
                  style={{ height: `${Math.max(2, Math.round((t.amount / maxTrend) * 130))}px` }}
                  title={`${t.label}: ${formatMoney(t.amount)}`}
                />
                <span className="text-xs font-medium text-slate-600">{t.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Overdue aging */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Overdue rent — aging</h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard tone="light" label="0–30 days" value={formatMoney(aging.d0_30)} />
          <StatCard tone="light" label="31–60 days" value={formatMoney(aging.d31_60)} />
          <StatCard tone="light" label="60+ days" value={formatMoney(aging.d61)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Revenue by payment method</h3>
          <Card className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2 font-medium">Method</th><th className="px-4 py-2 font-medium">Payments</th><th className="px-4 py-2 font-medium">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byMethod.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No revenue yet.</td></tr>}
                {byMethod.map((m) => (
                  <tr key={m.method}>
                    <td className="px-4 py-2 text-slate-700">{titleCase(m.method)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatNumber(m._count)}</td>
                    <td className="px-4 py-2 text-slate-700">{formatMoney(m._sum.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Invoices by status</h3>
          <Card className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Count</th><th className="px-4 py-2 font-medium">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byInvoiceStatus.map((s) => (
                  <tr key={s.status}>
                    <td className="px-4 py-2 text-slate-700">{titleCase(s.status)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatNumber(s._count)}</td>
                    <td className="px-4 py-2 text-slate-700">{formatMoney(s._sum.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
