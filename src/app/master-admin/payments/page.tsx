import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatMoney, formatNumber } from "@/lib/format";
import { PaymentsTabs, paymentTone, titleCase } from "./PaymentsTabs";
import { verifyPayment, refundPayment } from "./actions";

export const dynamic = "force-dynamic";

type Search = { status?: string; recorded?: string; refunded?: string };

const STATUSES = ["SUCCESS", "PENDING", "FAILED", "REFUNDED"];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : "";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [totalRevenue, monthRevenue, pendingRent, refunded, payments] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "REFUNDED" } }),
    prisma.payment.findMany({
      where: status ? { status: status as "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED" } : {},
      include: {
        tenant: { select: { fullName: true } },
        invoice: { include: { lease: { include: { property: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-4">
      {sp.recorded && <Banner tone="green">Payment recorded.</Banner>}
      {sp.refunded && <Banner tone="green">Refund processed.</Banner>}

      <PaymentsTabs active="transactions" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Total Revenue" value={formatMoney(totalRevenue._sum.amount)} hint="all successful" />
        <StatCard tone="light" label="This Month" value={formatMoney(monthRevenue._sum.amount)} />
        <StatCard tone="light" label="Pending Rent" value={formatMoney(pendingRent._sum.amount)} />
        <StatCard tone="light" label="Refunded" value={formatMoney(refunded._sum.amount)} />
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{titleCase(s)}</option>
          ))}
        </select>
        <button className={btn("secondary")}>Filter</button>
        {status && <Link href="/master-admin/payments" className={btn("ghost")}>Clear</Link>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No transactions found.</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-500">{(p.paidAt ?? p.createdAt).toLocaleDateString("en-US")}</td>
                <td className="px-4 py-3 text-slate-700">{p.tenant.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{p.invoice.lease.property.name}</td>
                <td className="px-4 py-3 text-slate-700">{formatMoney(p.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{titleCase(p.method)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={paymentTone(p.status)}>{titleCase(p.status)}</Badge>
                    {p.status === "SUCCESS" && (p.verified ? <Badge tone="sky">Verified</Badge> : <Badge tone="amber">Unverified</Badge>)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {p.status === "SUCCESS" && (
                      <Link href={`/master-admin/payments/${p.id}/receipt`} className={btn("secondary", "px-2.5 py-1.5")}>
                        Receipt
                      </Link>
                    )}
                    {p.status === "SUCCESS" && !p.verified && (
                      <form action={verifyPayment}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className={btn("ghost", "px-2.5 py-1.5")}>Verify</button>
                      </form>
                    )}
                    {p.status === "SUCCESS" && (
                      <form action={refundPayment}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton message="Refund this payment? The invoice will be marked unpaid." className={btn("danger", "px-2.5 py-1.5")}>
                          Refund
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "green"; children: React.ReactNode }) {
  return <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{children}</div>;
}
