import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/dashboard → portfolio summary.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const landlordId = user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    properties, occupied, tenants, expiringSoon,
    collection, pendingDue, openMaintenance, openComplaints,
    rating, unreadInquiries,
  ] = await Promise.all([
    prisma.property.count({ where: { landlordId } }),
    prisma.property.count({ where: { landlordId, availability: "OCCUPIED" } }),
    prisma.user.count({ where: { role: "TENANT", landlordId } }),
    prisma.lease.count({ where: { landlordId, status: { in: ["ACTIVE", "RENEWED"] }, endDate: { lte: new Date(now.getTime() + 30 * 86400000) } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd }, invoice: { lease: { landlordId } } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["PENDING", "OVERDUE"] }, lease: { landlordId } } }),
    prisma.maintenanceRequest.count({ where: { property: { landlordId }, status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.complaint.count({ where: { property: { landlordId }, status: { in: ["OPEN", "REOPENED", "RESPONDED"] } } }),
    prisma.rating.aggregate({ _avg: { stars: true }, where: { rateeId: landlordId, status: "VISIBLE" } }),
    prisma.inquiryMessage.count({ where: { fromGuest: true, readByLandlord: false, inquiry: { landlordId } } }),
  ]);

  return json({
    properties,
    occupied,
    vacant: properties - occupied,
    tenants,
    expiringSoon,
    monthlyCollection: Number(collection._sum.amount ?? 0),
    pendingDue: Number(pendingDue._sum.amount ?? 0),
    openMaintenance,
    openComplaints,
    rating: rating._avg.stars ? Number(rating._avg.stars.toFixed(1)) : null,
    unreadInquiries,
  });
}
