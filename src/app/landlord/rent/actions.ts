"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { formatMoney } from "@/lib/format";

const BACK = "/landlord/rent";

// Verify an invoice belongs to one of this landlord's leases.
async function ownInvoice(landlordId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, lease: { landlordId } },
    include: { lease: { include: { property: { select: { name: true } } } } },
  });
}

export async function generateInvoices() {
  const session = await requireLandlord();
  const now = new Date();
  const periodMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);

  const leases = await prisma.lease.findMany({
    where: { landlordId: session.user.id, status: { in: ["ACTIVE", "RENEWED"] } },
    select: { id: true, monthlyRent: true, maintenanceFee: true },
  });
  let created = 0;
  for (const lease of leases) {
    const existing = await prisma.invoice.findUnique({ where: { leaseId_periodMonth: { leaseId: lease.id, periodMonth } } });
    if (existing) continue;
    const amount = Number(lease.monthlyRent) + Number(lease.maintenanceFee ?? 0);
    await prisma.invoice.create({ data: { leaseId: lease.id, periodMonth, amount, dueDate, status: "PENDING" } });
    created++;
  }
  await audit({ actorId: session.user.id, action: "invoice.generate", entity: "Invoice", metadata: { created } });
  revalidatePath(BACK);
  redirect(`${BACK}?generated=${created}`);
}

export async function markOverdue() {
  const session = await requireLandlord();
  const res = await prisma.invoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: new Date() }, lease: { landlordId: session.user.id } },
    data: { status: "OVERDUE" },
  });
  await audit({ actorId: session.user.id, action: "invoice.markOverdue", entity: "Invoice", metadata: { count: res.count } });
  revalidatePath(BACK);
  redirect(`${BACK}?overdue=${res.count}`);
}

export async function recordPayment(formData: FormData) {
  const session = await requireLandlord();
  const invoiceId = String(formData.get("invoiceId"));
  const inv = await ownInvoice(session.user.id, invoiceId);
  if (!inv) redirect(BACK);
  const method = String(formData.get("method"));
  const allowed = ["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING"];
  const payMethod = (allowed.includes(method) ? method : "UPI") as "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "NET_BANKING";

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      tenantId: inv.lease.tenantId,
      amount: inv.amount,
      method: payMethod,
      status: "SUCCESS",
      verified: true,
      paidAt: new Date(),
      notes: "Recorded by landlord",
    },
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
  await audit({ actorId: session.user.id, action: "payment.record", entity: "Payment", entityId: payment.id });
  await notify(inv.lease.tenantId, { type: "payment", title: "Payment recorded", body: "Your landlord recorded a rent payment.", link: "/tenant/payments" });
  revalidatePath(BACK);
  redirect(`${BACK}?recorded=1`);
}

// Confirm a tenant's pending cash payment: mark it received and the invoice paid.
export async function confirmCashPayment(formData: FormData) {
  const session = await requireLandlord();
  const paymentId = String(formData.get("paymentId"));
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, method: "CASH", status: "PENDING", invoice: { lease: { landlordId: session.user.id } } },
  });
  if (!payment) redirect(BACK);

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "SUCCESS", verified: true, paidAt: new Date(), notes: "Cash received — confirmed by landlord" },
  });
  await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: "PAID" } });
  await audit({ actorId: session.user.id, action: "payment.cashConfirm", entity: "Payment", entityId: paymentId });
  await notify(payment.tenantId, { type: "payment", title: "Cash payment confirmed", body: "Your landlord confirmed your cash rent payment.", link: "/tenant/payments" });
  revalidatePath(BACK);
  redirect(`${BACK}?recorded=1`);
}

// Reject a pending cash payment (e.g. cash not actually received).
export async function rejectCashPayment(formData: FormData) {
  const session = await requireLandlord();
  const paymentId = String(formData.get("paymentId"));
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, method: "CASH", status: "PENDING", invoice: { lease: { landlordId: session.user.id } } },
  });
  if (!payment) redirect(BACK);

  await prisma.payment.update({ where: { id: paymentId }, data: { status: "FAILED", notes: "Cash not received — rejected by landlord" } });
  await audit({ actorId: session.user.id, action: "payment.cashReject", entity: "Payment", entityId: paymentId });
  await notify(payment.tenantId, { type: "payment", title: "Cash payment not confirmed", body: "Your landlord couldn't confirm your cash payment. Please follow up.", link: "/tenant/payments" });
  revalidatePath(BACK);
  redirect(`${BACK}?rejected=1`);
}

async function remind(inv: { id: string; amount: { toString(): string }; dueDate: Date; lease: { tenantId: string; property: { name: string } } }) {
  await prisma.notification.create({
    data: {
      userId: inv.lease.tenantId,
      type: "rent_reminder",
      title: "Rent payment reminder",
      body: `Your rent of ${formatMoney(inv.amount.toString())} for ${inv.lease.property.name} is due on ${inv.dueDate.toLocaleDateString("en-US")}.`,
      link: "/tenant/payments",
    },
  });
}

export async function sendReminder(formData: FormData) {
  const session = await requireLandlord();
  const invoiceId = String(formData.get("invoiceId"));
  const inv = await ownInvoice(session.user.id, invoiceId);
  if (!inv) redirect(BACK);
  await remind(inv);
  await audit({ actorId: session.user.id, action: "invoice.remind", entity: "Invoice", entityId: invoiceId });
  revalidatePath(BACK);
  redirect(`${BACK}?reminded=1`);
}

export async function remindAllOverdue() {
  const session = await requireLandlord();
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: new Date() }, lease: { landlordId: session.user.id } },
    include: { lease: { include: { property: { select: { name: true } } } } },
  });
  for (const inv of invoices) await remind(inv);
  await audit({ actorId: session.user.id, action: "invoice.remindAll", entity: "Invoice", metadata: { count: invoices.length } });
  revalidatePath(BACK);
  redirect(`${BACK}?reminded=${invoices.length}`);
}
