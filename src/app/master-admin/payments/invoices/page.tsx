import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatMoney, formatNumber } from "@/lib/format";
import { PaymentsTabs, invoiceTone, titleCase } from "../PaymentsTabs";
import { generateInvoices, markOverdue, recordPayment, cancelInvoice, sendReminder, remindAllOverdue } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "PAID", "OVERDUE", "CANCELLED"];
const METHODS = ["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING"];

type Search = { status?: string; generated?: string; overdue?: string; reminded?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : "";

  const invoices = await prisma.invoice.findMany({
    where: status ? { status: status as "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" } : {},
    include: {
      lease: { include: { property: { select: { name: true } }, tenant: { select: { fullName: true } } } },
    },
    orderBy: [{ periodMonth: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-4">
      {sp.generated !== undefined && (
        <Banner>Generated {formatNumber(Number(sp.generated))} invoice(s) for this month.</Banner>
      )}
      {sp.overdue !== undefined && (
        <Banner>Marked {formatNumber(Number(sp.overdue))} invoice(s) overdue.</Banner>
      )}
      {sp.reminded !== undefined && (
        <Banner>
          {sp.reminded === "1" ? "Reminder sent." : `Sent ${formatNumber(Number(sp.reminded))} reminder(s).`}
        </Banner>
      )}

      <PaymentsTabs active="invoices" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">
          Invoices <span className="text-slate-400">({formatNumber(invoices.length)})</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <form action={remindAllOverdue}>
            <button className={btn("secondary")}>Remind all overdue</button>
          </form>
          <form action={markOverdue}>
            <button className={btn("secondary")}>Mark overdue</button>
          </form>
          <form action={generateInvoices}>
            <button className={btn("primary")}>Generate this month</button>
          </form>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{titleCase(s)}</option>
          ))}
        </select>
        <button className={btn("secondary")}>Filter</button>
        {status && <Link href="/master-admin/payments/invoices" className={btn("ghost")}>Clear</Link>}
      </form>

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
                  <td className="px-4 py-3 text-slate-700">
                    {inv.periodMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.lease.property.name}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.lease.tenant.fullName}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(inv.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.dueDate.toLocaleDateString("en-US")}</td>
                  <td className="px-4 py-3"><Badge tone={invoiceTone(inv.status)}>{titleCase(inv.status)}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {owing && (
                        <form action={recordPayment} className="flex items-center gap-1">
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <select name="method" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
                            {METHODS.map((m) => (
                              <option key={m} value={m}>{titleCase(m)}</option>
                            ))}
                          </select>
                          <button className={btn("primary", "px-2.5 py-1.5")}>Record payment</button>
                        </form>
                      )}
                      {owing && (
                        <form action={sendReminder}>
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <button className={btn("ghost", "px-2.5 py-1.5")}>Remind</button>
                        </form>
                      )}
                      {inv.status !== "CANCELLED" && inv.status !== "PAID" && (
                        <form action={cancelInvoice}>
                          <input type="hidden" name="id" value={inv.id} />
                          <ConfirmButton message="Cancel this invoice?" className={btn("ghost", "px-2.5 py-1.5")}>
                            Cancel
                          </ConfirmButton>
                        </form>
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
