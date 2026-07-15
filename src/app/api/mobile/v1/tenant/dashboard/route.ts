import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/dashboard -> at-a-glance summary
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;

  const [lease, nextInvoice, openMaintenance, unread] = await Promise.all([
    prisma.lease.findFirst({
      where: { tenantId: user.id, status: { in: ["ACTIVE", "RENEWED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, monthlyRent: true, endDate: true, property: { select: { name: true } } },
    }),
    prisma.invoice.findFirst({
      where: { lease: { tenantId: user.id }, status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { dueDate: "asc" },
      select: { id: true, amount: true, dueDate: true, status: true },
    }),
    prisma.maintenanceRequest.count({
      where: { tenantId: user.id, status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] } },
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return json({
    lease: lease ? { id: lease.id, status: lease.status, monthlyRent: Number(lease.monthlyRent), endDate: lease.endDate, property: lease.property.name } : null,
    nextInvoice: nextInvoice ? { ...nextInvoice, amount: Number(nextInvoice.amount) } : null,
    openMaintenance,
    unreadNotifications: unread,
  });
}
