import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/payments → payment history for the tenant.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const payments = await prisma.payment.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      paidAt: true,
      receiptUrl: true,
      createdAt: true,
      invoice: { select: { id: true, periodMonth: true } },
    },
  });

  return json({
    items: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      receiptUrl: p.receiptUrl,
      createdAt: p.createdAt.toISOString(),
      invoiceId: p.invoice.id,
      periodMonth: p.invoice.periodMonth.toISOString(),
    })),
  });
}
