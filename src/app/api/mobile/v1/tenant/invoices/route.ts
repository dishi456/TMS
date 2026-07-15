import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/invoices -> rent invoices for the tenant's leases
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const invoices = await prisma.invoice.findMany({
    where: { lease: { tenantId: user.id } },
    orderBy: { dueDate: "desc" },
    select: { id: true, leaseId: true, periodMonth: true, amount: true, dueDate: true, status: true },
  });
  return json({ invoices: invoices.map((i) => ({ ...i, amount: Number(i.amount) })) });
}
