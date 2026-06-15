"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { formatMoney } from "@/lib/format";

function revalidatePayments() {
  revalidatePath("/master-admin/payments");
  revalidatePath("/master-admin/payments/invoices");
  revalidatePath("/master-admin/payments/reports");
}

// ---- FR-07: generate this month's invoices for active leases ----
export async function generateInvoices() {
  const session = await requireAdmin();
  const now = new Date();
  const periodMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);

  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] } },
    select: { id: true, monthlyRent: true, maintenanceFee: true },
  });

  let created = 0;
  for (const lease of leases) {
    const existing = await prisma.invoice.findUnique({
      where: { leaseId_periodMonth: { leaseId: lease.id, periodMonth } },
    });
    if (existing) continue;
    const amount = Number(lease.monthlyRent) + Number(lease.maintenanceFee ?? 0);
    await prisma.invoice.create({
      data: { leaseId: lease.id, periodMonth, amount, dueDate, status: "PENDING" },
    });
    created++;
  }

  await audit({ actorId: session.user.id, action: "invoice.generate", entity: "Invoice", metadata: { created } });
  revalidatePayments();
  redirect(`/master-admin/payments/invoices?generated=${created}`);
}

// ---- Flip overdue: PENDING invoices past their due date ----
export async function markOverdue() {
  const session = await requireAdmin();
  const res = await prisma.invoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });
  await audit({ actorId: session.user.id, action: "invoice.markOverdue", entity: "Invoice", metadata: { count: res.count } });
  revalidatePayments();
  redirect(`/master-admin/payments/invoices?overdue=${res.count}`);
}

// ---- Cancel an invoice ----
export async function cancelInvoice(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit({ actorId: session.user.id, action: "invoice.cancel", entity: "Invoice", entityId: id });
  revalidatePayments();
  redirect("/master-admin/payments/invoices");
}

// ---- FR-06: record a (manual/offline) payment against an invoice ----
export async function recordPayment(formData: FormData) {
  const session = await requireAdmin();
  const invoiceId = String(formData.get("invoiceId"));
  const method = String(formData.get("method"));
  const allowed = ["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING"];
  const payMethod = (allowed.includes(method) ? method : "UPI") as "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "NET_BANKING";

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lease: { select: { tenantId: true } } },
  });
  if (!invoice) redirect("/master-admin/payments/invoices");

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      tenantId: invoice.lease.tenantId,
      amount: invoice.amount,
      method: payMethod,
      status: "SUCCESS",
      verified: true,
      paidAt: new Date(),
      notes: "Recorded by admin",
    },
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
  await audit({ actorId: session.user.id, action: "payment.record", entity: "Payment", entityId: payment.id, metadata: { invoiceId } });

  await notify(invoice.lease.tenantId, { type: "payment", title: "Payment recorded", body: "A rent payment was recorded on your account.", link: "/tenant/payments" });

  revalidatePayments();
  redirect("/master-admin/payments?recorded=1");
}

// ---- Verify a payment record ----
export async function verifyPayment(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.payment.update({ where: { id }, data: { verified: true } });
  await audit({ actorId: session.user.id, action: "payment.verify", entity: "Payment", entityId: id });
  revalidatePayments();
  redirect("/master-admin/payments");
}

// ---- Payment reminders (FR-10): notify the tenant about a due invoice ----
type RemindableInvoice = {
  id: string;
  amount: { toString(): string };
  dueDate: Date;
  lease: { tenantId: string; property: { name: string } };
};

async function createReminder(invoice: RemindableInvoice) {
  await prisma.notification.create({
    data: {
      userId: invoice.lease.tenantId,
      type: "rent_reminder",
      title: "Rent payment reminder",
      body: `Your rent of ${formatMoney(invoice.amount.toString())} for ${invoice.lease.property.name} is due on ${invoice.dueDate.toLocaleDateString("en-US")}.`,
      link: "/tenant/payments",
    },
  });
}

export async function sendReminder(formData: FormData) {
  const session = await requireAdmin();
  const invoiceId = String(formData.get("invoiceId"));
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lease: { include: { property: { select: { name: true } } } } },
  });
  if (!invoice) redirect("/master-admin/payments/invoices");

  await createReminder(invoice);
  await audit({ actorId: session.user.id, action: "invoice.remind", entity: "Invoice", entityId: invoiceId });
  revalidatePayments();
  redirect("/master-admin/payments/invoices?reminded=1");
}

export async function remindAllOverdue() {
  const session = await requireAdmin();
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: new Date() } },
    include: { lease: { include: { property: { select: { name: true } } } } },
  });
  for (const inv of invoices) await createReminder(inv);

  await audit({ actorId: session.user.id, action: "invoice.remindAll", entity: "Invoice", metadata: { count: invoices.length } });
  revalidatePayments();
  redirect(`/master-admin/payments/invoices?reminded=${invoices.length}`);
}

// ---- Process a refund ----
export async function refundPayment(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") || "").trim() || null;

  const payment = await prisma.payment.update({
    where: { id },
    data: { status: "REFUNDED", refundedAt: new Date(), notes: reason },
  });
  // Money returned → the invoice is owed again.
  await prisma.invoice.update({ where: { id: payment.invoiceId }, data: { status: "PENDING" } });
  await audit({ actorId: session.user.id, action: "payment.refund", entity: "Payment", entityId: id, metadata: { reason } });

  revalidatePayments();
  redirect("/master-admin/payments?refunded=1");
}
