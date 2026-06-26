import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "CASH", "BANK_TRANSFER", "E_TRANSFER", "CHEQUE", "OTHER"]).default("UPI"),
  reference: z.string().trim().optional(),
  proofUrl: z.string().min(1, "Attach a payment screenshot."),
});

// POST /api/mobile/v1/tenant/payments/proof -> tenant submits a payment proof
// for an invoice (creates a PENDING payment the landlord then confirms).
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  const inv = await prisma.invoice.findFirst({
    where: { id: d.invoiceId, lease: { tenantId: user.id } },
    include: {
      lease: { select: { landlordId: true, property: { select: { name: true } } } },
      payments: { select: { amount: true, status: true } },
    },
  });
  if (!inv) return json({ error: "Invoice not found." }, 404);
  const paid = inv.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(inv.amount) - paid;
  if (balance <= 0) return json({ error: "This invoice is already paid." }, 400);
  if (inv.payments.some((p) => p.status === "PENDING")) return json({ error: "A payment proof is already awaiting confirmation." }, 400);

  const pay = await prisma.payment.create({
    data: { invoiceId: d.invoiceId, tenantId: user.id, amount: balance, method: d.method, reference: d.reference || null, proofUrl: d.proofUrl, status: "PENDING", verified: false, notes: "Proof submitted by tenant" },
    select: { id: true },
  });
  await notify(inv.lease.landlordId, { type: "payment", title: "Payment proof submitted", body: `Your tenant submitted a payment proof for ${inv.lease.property?.name ?? "rent"}.`, link: "/landlord/rent" });
  return json({ ok: true, paymentId: pay.id });
}
