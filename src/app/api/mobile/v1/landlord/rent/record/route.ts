import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { nextReceiptNumber } from "@/lib/receipt";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive().optional(), // partial; defaults to the outstanding balance
  method: z.enum(["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "CASH", "BANK_TRANSFER", "E_TRANSFER", "CHEQUE", "OTHER"]).default("CASH"),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  proofUrl: z.string().trim().optional(),
});

// POST /api/mobile/v1/landlord/rent/record -> record a (possibly partial) payment
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  const inv = await prisma.invoice.findFirst({
    where: { id: d.invoiceId, lease: { landlordId: user.id } },
    include: {
      lease: { select: { tenantId: true, signedContractUrl: true } },
      payments: { where: { status: "SUCCESS" }, select: { amount: true } },
    },
  });
  if (!inv) return json({ error: "Invoice not found." }, 404);
  if (!inv.lease.signedContractUrl) return json({ error: "Upload the signed lease agreement before recording payments." }, 400);

  const invoiceAmount = Number(inv.amount);
  const paidSoFar = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, invoiceAmount - paidSoFar);
  if (balance <= 0) return json({ error: "This invoice is already fully paid." }, 400);

  const amount = Math.min(d.amount ?? balance, balance);
  if (amount <= 0) return json({ error: "Enter a valid amount." }, 400);

  const receiptNumber = await nextReceiptNumber();
  const payment = await prisma.payment.create({
    data: {
      invoiceId: d.invoiceId, tenantId: inv.lease.tenantId, amount, method: d.method,
      status: "SUCCESS", verified: true, paidAt: new Date(), receiptNumber,
      reference: d.reference || null, proofUrl: d.proofUrl || null,
      notes: d.notes || "Recorded by landlord (mobile)",
    },
    select: { id: true, receiptNumber: true },
  });

  const newPaid = paidSoFar + amount;
  const status = newPaid >= invoiceAmount ? "PAID" : "PARTIALLY_PAID";
  await prisma.invoice.update({ where: { id: d.invoiceId }, data: { status } });
  await audit({ actorId: user.id, action: "payment.record", entity: "Payment", entityId: payment.id });
  await notify(inv.lease.tenantId, {
    type: "payment", title: status === "PAID" ? "Payment recorded" : "Partial payment recorded",
    body: `Your landlord recorded ₹${amount.toLocaleString("en-IN")} (${receiptNumber}).`, link: "/tenant/payments",
  });
  return json({ ok: true, paymentId: payment.id, receiptNumber, status, balance: Math.max(0, balance - amount) });
}
