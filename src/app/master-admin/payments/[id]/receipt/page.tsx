import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { titleCase } from "../../PaymentsTabs";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Payment Receipt" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      tenant: { select: { fullName: true, email: true } },
      invoice: {
        include: { lease: { include: { property: { select: { name: true, address: true } }, landlord: { select: { fullName: true } } } } },
      },
    },
  });
  if (!payment) notFound();

  const paidOn = (payment.paidAt ?? payment.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const period = payment.invoice.periodMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/master-admin/payments" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to payments
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Payment Receipt</h1>
            <p className="text-sm text-slate-500">Lease Lord</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-400">Receipt No.</p>
            <p className="font-mono text-slate-700">{payment.id.slice(-10).toUpperCase()}</p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4">
          {payment.status === "SUCCESS" ? (
            <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
              ✓ Paid
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {titleCase(payment.status)}
            </span>
          )}
        </div>

        {/* Details */}
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Row label="Paid by" value={payment.tenant.fullName} />
          <Row label="Email" value={payment.tenant.email} />
          <Row label="Property" value={payment.invoice.lease.property.name} />
          <Row label="Landlord" value={payment.invoice.lease.landlord.fullName} />
          <Row label="Billing period" value={period} />
          <Row label="Payment date" value={paidOn} />
          <Row label="Method" value={titleCase(payment.method)} />
          <Row label="Reference" value={payment.gatewayPaymentId ?? payment.notes ?? "—"} />
        </dl>

        {/* Amount */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm font-medium text-slate-500">Amount paid</span>
          <span className="text-2xl font-semibold text-slate-900">{formatMoney(payment.amount)}</span>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          This is a system-generated receipt and does not require a signature.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
