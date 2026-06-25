import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/rent -> invoices across this landlord's leases
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const invoices = await prisma.invoice.findMany({
    where: { lease: { landlordId: user.id } },
    orderBy: { dueDate: "desc" },
    include: {
      lease: { select: { id: true, tenant: { select: { id: true, fullName: true } }, property: { select: { id: true, name: true } } } },
      payments: { orderBy: { createdAt: "desc" }, select: { id: true, amount: true, method: true, status: true, paidAt: true, reference: true, receiptNumber: true, proofUrl: true } },
    },
  });
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let collectedThisMonth = 0;
  let pending = 0;
  let overdue = 0;
  for (const i of invoices) {
    const amt = Number(i.amount);
    const paid = i.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, amt - paid);
    // collected-this-month = successful payments dated this month
    for (const p of i.payments) {
      if (p.status === "SUCCESS" && p.paidAt && p.paidAt.getMonth() === month && p.paidAt.getFullYear() === year) collectedThisMonth += Number(p.amount);
    }
    if (i.status !== "PAID" && i.status !== "CANCELLED") {
      pending += balance;
      if (i.dueDate < now) overdue += balance;
    }
  }

  return json({
    kpis: { collectedThisMonth, pending, overdue },
    invoices: invoices.map((i) => {
      const amount = Number(i.amount);
      const amountPaid = i.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0);
      return {
        id: i.id, leaseId: i.leaseId, periodMonth: i.periodMonth, amount, dueDate: i.dueDate, status: i.status,
        amountPaid, balance: Math.max(0, amount - amountPaid),
        tenant: i.lease.tenant, property: i.lease.property,
        payments: i.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      };
    }),
  });
}
