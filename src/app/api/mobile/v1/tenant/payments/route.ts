import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/payments -> the tenant's payment history
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const payments = await prisma.payment.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, invoiceId: true, amount: true, method: true, status: true,
      paidAt: true, createdAt: true, receiptUrl: true, verified: true,
    },
  });
  return json({ payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })) });
}
