import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { nextReceiptNumber } from "@/lib/receipt";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUICK_NOTE = "Marked paid by landlord";
const schema = z.object({ invoiceId: z.string().min(1), paid: z.boolean() });

// POST /api/mobile/v1/landlord/rent/mark  { invoiceId, paid }
// Quick toggle: mark an invoice paid (records a CASH payment for the balance +
// receipt) or unpaid (reverts the quick-mark + sets the invoice back to pending).
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const { invoiceId, paid } = parsed.data;

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, lease: { landlordId: user.id } },
    include: { lease: { select: { tenantId: true } }, payments: { select: { id: true, amount: true, status: true, notes: true } } },
  });
  if (!inv) return json({ error: "Invoice not found." }, 404);

  if (paid) {
    const already = inv.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, Number(inv.amount) - already);
    if (balance > 0) {
      const receiptNumber = await nextReceiptNumber();
      await prisma.payment.create({
        data: { invoiceId, tenantId: inv.lease.tenantId, amount: balance, method: "CASH", status: "SUCCESS", verified: true, paidAt: new Date(), receiptNumber, notes: QUICK_NOTE },
      });
    }
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
    await audit({ actorId: user.id, action: "rent.mark_paid", entity: "Invoice", entityId: invoiceId });
    await notify(inv.lease.tenantId, { type: "payment", title: "Rent marked paid", body: "Your landlord marked this month's rent as paid.", link: "/tenant/payments" });
    return json({ ok: true, status: "PAID" });
  }

  // Unmark: remove the landlord's quick-mark payment(s) and set back to pending.
  await prisma.payment.deleteMany({ where: { invoiceId, notes: QUICK_NOTE } });
  const status = inv.dueDate && inv.dueDate < new Date() ? "OVERDUE" : "PENDING";
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  await audit({ actorId: user.id, action: "rent.mark_unpaid", entity: "Invoice", entityId: invoiceId });
  return json({ ok: true, status });
}
