import Link from "next/link";

const TABS = [
  { href: "/master-admin/payments", label: "Transactions", key: "transactions" },
  { href: "/master-admin/payments/invoices", label: "Invoices", key: "invoices" },
  { href: "/master-admin/payments/reports", label: "Reports", key: "reports" },
];

export function PaymentsTabs({ active }: { active: "transactions" | "invoices" | "reports" }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            active === t.key ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

const PAYMENT_TONE: Record<string, "green" | "red" | "sky" | "amber" | "slate"> = {
  SUCCESS: "green",
  PENDING: "amber",
  FAILED: "red",
  REFUNDED: "slate",
};
const INVOICE_TONE: Record<string, "green" | "red" | "sky" | "amber" | "slate"> = {
  PAID: "green",
  PENDING: "amber",
  OVERDUE: "red",
  CANCELLED: "slate",
};

export function paymentTone(status: string) {
  return PAYMENT_TONE[status] ?? "slate";
}
export function invoiceTone(status: string) {
  return INVOICE_TONE[status] ?? "slate";
}
export function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
