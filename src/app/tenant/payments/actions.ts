"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

// Pay an invoice online. NOTE: this simulates a payment-gateway success.
// To go live, replace the simulated block with a Razorpay order + webhook
// confirmation — the surrounding flow (Payment row + invoice status) is the same.
export async function payInvoice(formData: FormData) {
  const session = await requireTenant();
  const invoiceId = String(formData.get("invoiceId"));
  const method = String(formData.get("method"));
  const allowed = ["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "CASH"];
  const payMethod = (allowed.includes(method) ? method : "UPI") as
    | "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "NET_BANKING" | "CASH";

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, lease: { tenantId: session.user.id }, status: { in: ["PENDING", "OVERDUE"] } },
    include: { lease: { select: { landlordId: true } } },
  });
  if (!invoice) redirect("/tenant/payments?error=invalid");

  // ---- Cash: log a PENDING payment; the landlord must confirm "cash received". ----
  if (payMethod === "CASH") {
    // Guard: don't stack multiple pending cash requests on the same invoice.
    const existing = await prisma.payment.findFirst({
      where: { invoiceId, method: "CASH", status: "PENDING" },
    });
    if (existing) {
      revalidatePath("/tenant/payments");
      redirect("/tenant/payments?cash=exists");
    }
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        tenantId: session.user.id,
        amount: invoice.amount,
        method: "CASH",
        status: "PENDING",
        notes: "Cash payment — awaiting landlord confirmation",
      },
    });
    await audit({ actorId: session.user.id, action: "payment.cashRequest", entity: "Payment", entityId: payment.id });
    await notify(invoice.lease.landlordId, {
      type: "payment",
      title: "Cash payment to confirm",
      body: "A tenant marked their rent as paid in cash — please confirm you received it.",
      link: "/landlord/rent",
    });
    revalidatePath("/tenant/payments");
    redirect("/tenant/payments?cash=1");
  }

  // ---- Online (simulated gateway) ----
  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      tenantId: session.user.id,
      amount: invoice.amount,
      method: payMethod,
      status: "SUCCESS",
      gatewayOrderId: `order_sim_${randomUUID().slice(0, 10)}`,
      gatewayPaymentId: `pay_sim_${randomUUID().slice(0, 10)}`,
      paidAt: new Date(),
      notes: "Online payment (simulated)",
    },
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
  await audit({ actorId: session.user.id, action: "payment.online", entity: "Payment", entityId: payment.id });

  await notify(invoice.lease.landlordId, { type: "payment", title: "Rent payment received", body: "A rent payment was received.", link: "/landlord/rent" });

  revalidatePath("/tenant/payments");
  redirect(`/tenant/payments?paid=${payment.id}`);
}
