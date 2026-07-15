import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/dashboard — full KPI set the app shows.
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const lid = user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    properties, occupied, tenants, activeLeases, expiringSoon,
    openMaintenance, openComplaints, pendingApplications, unread, unreadInquiries,
    collected, due, rating,
  ] = await Promise.all([
    prisma.property.count({ where: { landlordId: lid } }),
    prisma.property.count({ where: { landlordId: lid, availability: "OCCUPIED" } }),
    prisma.user.count({ where: { role: "TENANT", landlordId: lid } }),
    prisma.lease.count({ where: { landlordId: lid, status: { in: ["ACTIVE", "RENEWED"] } } }),
    prisma.lease.count({ where: { landlordId: lid, status: { in: ["ACTIVE", "RENEWED"] }, endDate: { gte: now, lte: in30 } } }),
    prisma.maintenanceRequest.count({ where: { property: { landlordId: lid }, status: { notIn: ["RESOLVED", "CLOSED", "REJECTED"] } } }),
    prisma.complaint.count({ where: { property: { landlordId: lid }, status: { in: ["OPEN", "RESPONDED", "REOPENED"] } } }),
    prisma.application.count({ where: { property: { landlordId: lid }, status: "PENDING" } }),
    prisma.notification.count({ where: { userId: lid, read: false } }),
    prisma.propertyInquiry.count({ where: { landlordId: lid, messages: { some: { fromGuest: true, readByLandlord: false } } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart }, invoice: { lease: { landlordId: lid } } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] }, lease: { landlordId: lid } } }),
    prisma.rating.aggregate({ _avg: { stars: true }, where: { rateeId: lid, direction: "TENANT_TO_LANDLORD", status: "VISIBLE" } }),
  ]);

  const pendingDue = due._sum.amount ? Number(due._sum.amount) : 0;
  return json({
    properties,
    occupied,
    vacant: Math.max(0, properties - occupied),
    tenants,
    activeLeases,
    expiringSoon,
    openMaintenance,
    openComplaints,
    pendingApplications,
    monthlyCollection: collected._sum.amount ? Number(collected._sum.amount) : 0,
    pendingDue,
    pendingRent: pendingDue,
    rating: rating._avg.stars != null ? Number(Number(rating._avg.stars).toFixed(1)) : null,
    unreadInquiries,
    unreadNotifications: unread,
  });
}
