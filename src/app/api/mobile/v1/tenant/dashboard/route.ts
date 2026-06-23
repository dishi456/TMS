import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/dashboard → at-a-glance summary for the home screen.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;
  const tenantId = user.id;

  const [lease, nextInvoice, openMaintenance, unreadNotifications] = await Promise.all([
    prisma.lease.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "RENEWED"] } },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        monthlyRent: true,
        endDate: true,
        status: true,
        property: { select: { name: true, address: true } },
      },
    }),
    prisma.invoice.findFirst({
      where: { lease: { tenantId }, status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { dueDate: "asc" },
      select: { id: true, amount: true, dueDate: true, status: true, periodMonth: true },
    }),
    prisma.maintenanceRequest.count({
      where: { tenantId, status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] } },
    }),
    prisma.notification.count({ where: { userId: tenantId, read: false } }),
  ]);

  return json({
    lease: lease
      ? {
          id: lease.id,
          monthlyRent: Number(lease.monthlyRent),
          endDate: lease.endDate.toISOString(),
          status: lease.status,
          property: lease.property,
        }
      : null,
    nextInvoice: nextInvoice
      ? {
          id: nextInvoice.id,
          amount: Number(nextInvoice.amount),
          dueDate: nextInvoice.dueDate.toISOString(),
          status: nextInvoice.status,
          periodMonth: nextInvoice.periodMonth.toISOString(),
        }
      : null,
    openMaintenanceCount: openMaintenance,
    unreadNotifications,
  });
}
