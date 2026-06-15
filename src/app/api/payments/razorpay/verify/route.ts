import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RAZORPAY_KEY_SECRET } from "@/lib/razorpay";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";

const ALLOWED = ["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TENANT") return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, method } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !RAZORPAY_KEY_SECRET) {
    return json({ error: "Missing fields" }, 400);
  }

  // Verify the gateway signature.
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (expected !== razorpay_signature) return json({ error: "Invalid signature" }, 400);

  const invoice = await prisma.invoice.findFirst({
    where: { id: String(invoiceId), lease: { tenantId: session.user.id }, status: { in: ["PENDING", "OVERDUE"] } },
    include: { lease: { select: { landlordId: true } } },
  });
  if (!invoice) return json({ error: "Invoice not payable" }, 400);

  const payMethod = (ALLOWED.includes(method) ? method : "UPI") as "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "NET_BANKING";
  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      tenantId: session.user.id,
      amount: invoice.amount,
      method: payMethod,
      status: "SUCCESS",
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      paidAt: new Date(),
      notes: "Razorpay online payment",
    },
  });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
  await notify(invoice.lease.landlordId, { type: "payment", title: "Rent payment received", body: "A rent payment was received online.", link: "/landlord/rent" });

  return json({ ok: true, paymentId: payment.id });
}
