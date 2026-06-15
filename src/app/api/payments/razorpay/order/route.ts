import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay, RAZORPAY_KEY_ID } from "@/lib/razorpay";

export const runtime = "nodejs";

const CURRENCY = process.env.RAZORPAY_CURRENCY || "INR";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TENANT") return json({ error: "Unauthorized" }, 401);

  const { invoiceId } = await req.json().catch(() => ({}));
  const invoice = await prisma.invoice.findFirst({
    where: { id: String(invoiceId), lease: { tenantId: session.user.id }, status: { in: ["PENDING", "OVERDUE"] } },
  });
  if (!invoice) return json({ error: "Invoice not payable" }, 400);

  const rzp = getRazorpay();
  if (!rzp) return json({ error: "Payments not configured" }, 400);

  const order = await rzp.orders.create({
    amount: Math.round(Number(invoice.amount) * 100),
    currency: CURRENCY,
    receipt: invoice.id,
    notes: { invoiceId: invoice.id },
  });

  return json({ orderId: order.id, amount: order.amount, currency: CURRENCY, keyId: RAZORPAY_KEY_ID });
}
