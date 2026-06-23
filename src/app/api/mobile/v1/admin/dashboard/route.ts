import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/dashboard → platform-wide stats.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    landlords, tenants, users, properties, occupied, activeLeases,
    revenue, pendingRent, openMaintenance, complaints,
    pendingLandlords, pendingProperties, flaggedReviews,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "LANDLORD" } }),
    prisma.user.count({ where: { role: "TENANT" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.property.count(),
    prisma.property.count({ where: { availability: "OCCUPIED" } }),
    prisma.lease.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.complaint.count({ where: { status: { in: ["OPEN", "REOPENED", "RESPONDED"] } } }),
    prisma.user.count({ where: { role: "LANDLORD", status: "PENDING" } }),
    prisma.property.count({ where: { approved: false } }),
    prisma.rating.count({ where: { status: "FLAGGED" } }),
  ]);

  return json({
    landlords, tenants, users, properties, occupied, vacant: properties - occupied, activeLeases,
    monthlyRevenue: Number(revenue._sum.amount ?? 0),
    pendingRent: Number(pendingRent._sum.amount ?? 0),
    openMaintenance, openComplaints: complaints,
    pendingLandlords, pendingProperties, flaggedReviews,
  });
}
