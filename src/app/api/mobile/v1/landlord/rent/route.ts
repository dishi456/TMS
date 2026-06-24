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
      payments: { orderBy: { createdAt: "desc" }, select: { id: true, amount: true, method: true, status: true, paidAt: true } },
    },
  });
  return json({
    invoices: invoices.map((i) => ({
      id: i.id, leaseId: i.leaseId, periodMonth: i.periodMonth, amount: Number(i.amount), dueDate: i.dueDate, status: i.status,
      tenant: i.lease.tenant, property: i.lease.property,
      payments: i.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    })),
  });
}
