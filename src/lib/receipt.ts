import { prisma } from "@/lib/prisma";

// Sequential, human-friendly receipt id: PAY-2026-000125
export async function nextReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const count = await prisma.payment.count({ where: { receiptNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, "0")}`;
}

const MONEY = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const METHOD_LABEL: Record<string, string> = {
  UPI: "UPI", DEBIT_CARD: "Debit Card", CREDIT_CARD: "Credit Card", NET_BANKING: "Net Banking",
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", E_TRANSFER: "E-Transfer", CHEQUE: "Cheque", OTHER: "Other",
};

export type ReceiptData = {
  receiptNumber: string; amount: number; method: string; reference: string | null;
  paidAt: Date | null; periodMonth: Date | null; status: string;
  property: string; tenant: string; landlord: string; notes: string | null;
};

// Self-contained printable HTML receipt (opened in the in-app browser → print/save as PDF).
export function receiptHtml(d: ReceiptData): string {
  const row = (k: string, v: string) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`;
  const month = d.periodMonth ? new Date(d.periodMonth).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—";
  const date = d.paidAt ? new Date(d.paidAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${d.receiptNumber}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f1f5f9;color:#0f172a}
  .card{max-width:480px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0}
  .hd{background:#2563EB;color:#fff;padding:20px 24px}
  .hd h1{margin:0;font-size:20px} .hd p{margin:4px 0 0;opacity:.85;font-size:13px}
  .amt{padding:20px 24px;border-bottom:1px solid #e2e8f0}
  .amt .big{font-size:32px;font-weight:800} .amt .st{display:inline-block;margin-top:6px;background:#dcfce7;color:#166534;font-weight:700;font-size:12px;padding:3px 10px;border-radius:999px}
  table{width:100%;border-collapse:collapse;padding:8px 24px} td{padding:10px 24px;font-size:14px;border-bottom:1px solid #f1f5f9}
  td.k{color:#64748b} td.v{text-align:right;font-weight:600}
  .ft{padding:16px 24px;color:#94a3b8;font-size:12px;text-align:center}
  @media print{body{background:#fff}.card{border:none;margin:0}}
</style></head><body>
  <div class="card">
    <div class="hd"><h1>Lease Lord · Payment Receipt</h1><p>${d.receiptNumber}</p></div>
    <div class="amt"><div class="big">${MONEY(d.amount)}</div><span class="st">${d.status}</span></div>
    <table>
      ${row("Rent month", month)}
      ${row("Property", d.property)}
      ${row("Tenant", d.tenant)}
      ${row("Landlord", d.landlord)}
      ${row("Payment method", METHOD_LABEL[d.method] ?? d.method)}
      ${d.reference ? row("Reference", d.reference) : ""}
      ${row("Paid on", date)}
      ${d.notes ? row("Notes", d.notes) : ""}
    </table>
    <div class="ft">This is a system-generated receipt from Lease Lord.</div>
  </div>
</body></html>`;
}
