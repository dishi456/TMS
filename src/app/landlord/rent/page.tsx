import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { generateInvoices, markOverdue, recordPayment, sendReminder, remindAllOverdue } from "./actions";

export const dynamic = "force-dynamic";

const METHODS = ["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING"];
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

type Search = { generated?: string; overdue?: string; reminded?: string; recorded?: string };

export default async function RentPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const session = await auth();
  const landlordId = session!.user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [collected, pending, overdueAgg, invoices] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd }, invoice: { lease: { landlordId } } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] }, lease: { landlordId } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "OVERDUE", lease: { landlordId } } }),
    prisma.invoice.findMany({
      where: { lease: { landlordId } },
      include: { lease: { include: { property: { select: { name: true } }, tenant: { select: { fullName: true } } } } },
      orderBy: { periodMonth: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-4">
      {sp.generated !== undefined && <Banner>Generated {formatNumber(Number(sp.generated))} invoice(s).</Banner>}
      {sp.overdue !== undefined && <Banner>Marked {formatNumber(Number(sp.overdue))} overdue.</Banner>}
      {sp.reminded !== undefined && <Banner>{sp.reminded === "1" ? "Reminder sent." : `Sent ${formatNumber(Number(sp.reminded))} reminders.`}</Banner>}
      {sp.recorded && <Banner>Payment recorded.</Banner>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-slate-800">Rent Management</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/landlord/rent/export" className={btn("secondary")}>⬇ Report (CSV)</a>
          <form action={remindAllOverdue}><button className={btn("secondary")}>Remind overdue</button></form>
          <form action={markOverdue}><button className={btn("secondary")}>Mark overdue</button></form>
          <form action={generateInvoices}><button className={btn("primary")}>Generate this month</button></form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard tone="light" label="Collected this month" value={formatMoney(collected._sum.amount)} />
        <StatCard tone="light" label="Pending" value={formatMoney(pending._sum.amount)} />
        <StatCard tone="light" label="Overdue" value={formatMoney(overdueAgg._sum.amount)} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No invoices. Use “Generate this month”.</td></tr>
            )}
            {invoices.map((inv) => {
              const owing = inv.status === "PENDING" || inv.status === "OVERDUE";
              return (
                <tr key={inv.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-700">{inv.periodMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.lease.property.name}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.lease.tenant.fullName}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(inv.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.dueDate.toLocaleDateString("en-US")}</td>
                  <td className="px-4 py-3"><Badge tone={inv.status === "PAID" ? "green" : inv.status === "OVERDUE" ? "red" : inv.status === "CANCELLED" ? "slate" : "amber"}>{cap(inv.status)}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {owing && (
                        <>
                          <form action={recordPayment} className="flex items-center gap-1">
                            <input type="hidden" name="invoiceId" value={inv.id} />
                            <select name="method" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
                              {METHODS.map((m) => <option key={m} value={m}>{cap(m)}</option>)}
                            </select>
                            <button className={btn("primary", "px-2.5 py-1.5")}>Record</button>
                          </form>
                          <form action={sendReminder}><input type="hidden" name="invoiceId" value={inv.id} /><button className={btn("ghost", "px-2.5 py-1.5")}>Remind</button></form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{children}</div>;
}
