import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/payments -> the tenant's payment history (same
// records the landlord sees — single source of truth).
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const payments = await prisma.payment.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, invoiceId: true, amount: true, method: true, status: true,
      paidAt: true, createdAt: true, receiptNumber: true, reference: true, proofUrl: true, receiptUrl: true, verified: true,
      invoice: { select: { periodMonth: true, lease: { select: { property: { select: { name: true } } } } } },
    },
  });
  return json({
    payments: payments.map((p) => ({
      id: p.id, invoiceId: p.invoiceId, amount: Number(p.amount), method: p.method, status: p.status,
      paidAt: p.paidAt, createdAt: p.createdAt, receiptNumber: p.receiptNumber, reference: p.reference,
      proofUrl: p.proofUrl, receiptUrl: p.receiptNumber ? `/api/receipts/${p.id}` : null,
      periodMonth: p.invoice?.periodMonth ?? null, property: p.invoice?.lease?.property?.name ?? null,
    })),
  });
}
