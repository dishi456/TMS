import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { formatMoney } from "@/lib/format";
import { razorpayConfigured } from "@/lib/razorpay";
import { payInvoice } from "./actions";
import { RazorpayButton } from "./RazorpayButton";

export const metadata: Metadata = { title: "Pay Rent" };
export const dynamic = "force-dynamic";

const METHODS = ["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "CASH"];
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export default async function TenantPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; error?: string; cash?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const tenantId = session!.user.id;

  const [dues, paidAgg, invoices, payments] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { lease: { tenantId }, status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { tenantId, status: "SUCCESS" } }),
    prisma.invoice.findMany({
      where: { lease: { tenantId }, status: { in: ["PENDING", "OVERDUE"] } },
      include: { lease: { include: { property: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { tenantId },
      include: { invoice: { include: { lease: { include: { property: { select: { name: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Rent &amp; Payments</h1>
      {sp.paid && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <span>Payment successful!</span>
          <Link href={`/tenant/payments/${sp.paid}/receipt`} className="font-medium underline">View receipt</Link>
        </div>
      )}
      {sp.error === "invalid" && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">That invoice can&apos;t be paid.</div>}
      {sp.cash === "1" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">Cash payment logged — waiting for your landlord to confirm they received it.</div>}
      {sp.cash === "exists" && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">You already have a cash payment awaiting confirmation for that invoice.</div>}

      <div className="grid grid-cols-2 gap-3">
        <StatCard tone="light" label="Pending Dues" value={formatMoney(dues._sum.amount)} />
        <StatCard tone="light" label="Total Paid" value={formatMoney(paidAgg._sum.amount)} />
      </div>

      {/* Pending dues */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Pending dues</h2>
        {invoices.length === 0 ? (
          <Card><p className="text-sm text-slate-400">You&apos;re all paid up. 🎉</p></Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card key={inv.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{formatMoney(inv.amount)} · {inv.periodMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                    <p className="text-xs text-slate-400">{inv.lease.property.name} · due {inv.dueDate.toLocaleDateString("en-US")}</p>
                  </div>
                  {inv.status === "OVERDUE" && <Badge tone="red">Overdue</Badge>}
                </div>
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {razorpayConfigured() ? (
                    <>
                      <RazorpayButton invoiceId={inv.id} label={`Pay ${formatMoney(inv.amount)} online`} />
                      <form action={payInvoice}>
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <input type="hidden" name="method" value="CASH" />
                        <button className={btn("secondary")}>💵 Mark as paid by cash</button>
                      </form>
                    </>
                  ) : (
                    <form action={payInvoice} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <select name="method" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                        {METHODS.map((m) => <option key={m} value={m}>{cap(m)}</option>)}
                      </select>
                      <button className={btn("primary")}>Pay {formatMoney(inv.amount)}</button>
                    </form>
                  )}
                  <p className="text-xs text-slate-400">Cash payments are confirmed by your landlord before they count as paid.</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Transaction history</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Property</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Method</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Receipt</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No transactions yet.</td></tr>}
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-500">{(p.paidAt ?? p.createdAt).toLocaleDateString("en-US")}</td>
                  <td className="px-4 py-3 text-slate-600">{p.invoice.lease.property.name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{cap(p.method)}</td>
                  <td className="px-4 py-3"><Badge tone={p.status === "SUCCESS" ? "green" : p.status === "REFUNDED" ? "slate" : p.status === "FAILED" ? "red" : "amber"}>{cap(p.status)}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "SUCCESS" && <Link href={`/tenant/payments/${p.id}/receipt`} className={btn("secondary", "px-2.5 py-1.5")}>Receipt</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
