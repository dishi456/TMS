import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { nextReceiptNumber } from "@/lib/receipt";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ paymentId: z.string().min(1), action: z.enum(["confirm", "reject"]).default("confirm") });

// POST /api/mobile/v1/landlord/rent/confirm -> confirm/reject a tenant-submitted
// payment proof. Confirm marks it SUCCESS (with a receipt) + updates the invoice.
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const { paymentId, action } = parsed.data;

  const pay = await prisma.payment.findFirst({
    where: { id: paymentId, status: "PENDING", invoice: { lease: { landlordId: user.id } } },
    include: { invoice: { select: { id: true, amount: true, lease: { select: { tenantId: true } }, payments: { where: { status: "SUCCESS" }, select: { amount: true } } } } },
  });
  if (!pay) return json({ error: "Pending payment not found." }, 404);

  if (action === "reject") {
    await prisma.payment.delete({ where: { id: paymentId } });
    await audit({ actorId: user.id, action: "payment.reject", entity: "Payment", entityId: paymentId });
    await notify(pay.invoice.lease.tenantId, { type: "payment", title: "Payment proof rejected", body: "Your landlord couldn't verify the payment. Please re-submit.", link: "/tenant/payments" });
    return json({ ok: true, action: "reject" });
  }

  const receiptNumber = await nextReceiptNumber();
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "SUCCESS", verified: true, paidAt: new Date(), receiptNumber } });
  const invoiceAmount = Number(pay.invoice.amount);
  const paidNow = pay.invoice.payments.reduce((s, p) => s + Number(p.amount), 0) + Number(pay.amount);
  const status = paidNow >= invoiceAmount ? "PAID" : "PARTIALLY_PAID";
  await prisma.invoice.update({ where: { id: pay.invoice.id }, data: { status } });
  await audit({ actorId: user.id, action: "payment.confirm", entity: "Payment", entityId: paymentId });
  await notify(pay.invoice.lease.tenantId, { type: "payment", title: "Payment confirmed", body: `Your payment was confirmed (${receiptNumber}).`, link: "/tenant/payments" });
  return json({ ok: true, action: "confirm", receiptNumber, status });
}
