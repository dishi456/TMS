import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/dashboard -> platform overview (full KPI set).
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    landlords, tenants, seekers, properties, occupied, pendingProperties, pendingLandlords,
    activeLeases, openMaintenance, openComplaints, flaggedReviews, unread, revenue, due,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "LANDLORD" } }),
    prisma.user.count({ where: { role: "TENANT" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.property.count(),
    prisma.property.count({ where: { availability: "OCCUPIED" } }),
    prisma.property.count({ where: { approved: false } }),
    prisma.user.count({ where: { role: "LANDLORD", status: "PENDING" } }),
    prisma.lease.count({ where: { status: { in: ["ACTIVE", "RENEWED"] } } }),
    prisma.maintenanceRequest.count({ where: { status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] } } }),
    prisma.complaint.count({ where: { status: { in: ["OPEN", "RESPONDED", "REOPENED"] } } }),
    prisma.rating.count({ where: { status: "FLAGGED" } }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] } } }),
  ]);

  return json({
    landlords,
    tenants,
    seekers,
    users: seekers,
    properties,
    occupied,
    vacant: Math.max(0, properties - occupied),
    pendingProperties,
    pendingLandlords,
    activeLeases,
    openMaintenance,
    openComplaints,
    flaggedReviews,
    monthlyRevenue: revenue._sum.amount ? Number(revenue._sum.amount) : 0,
    pendingRent: due._sum.amount ? Number(due._sum.amount) : 0,
    unreadNotifications: unread,
  });
}
