import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/invoices → rent invoices across the tenant's leases.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const invoices = await prisma.invoice.findMany({
    where: { lease: { tenantId: user.id } },
    orderBy: { dueDate: "desc" },
    select: { id: true, periodMonth: true, amount: true, dueDate: true, status: true },
  });

  return json({
    items: invoices.map((i) => ({
      id: i.id,
      periodMonth: i.periodMonth.toISOString(),
      amount: Number(i.amount),
      dueDate: i.dueDate.toISOString(),
      status: i.status,
    })),
  });
}
