import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LandlordHome() {
  const session = await auth();
  const landlordId = session!.user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const soon = new Date(now.getTime() + 30 * 86400000);
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const [
    me,
    totalProperties,
    occupiedProps,
    activeTenants,
    expiringSoon,
    monthCollection,
    pendingPayments,
    openMaintenance,
    openComplaints,
    avgRating,
    pendingApps,
    pendingVisits,
    newEnquiries,
    recentProperties,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: landlordId }, select: { verified: true } }),
    prisma.property.count({ where: { landlordId } }),
    prisma.lease.findMany({ where: { landlordId, status: { in: ["ACTIVE", "RENEWED"] } }, select: { propertyId: true }, distinct: ["propertyId"] }),
    prisma.user.count({ where: { landlordId, role: "TENANT", status: "ACTIVE" } }),
    prisma.lease.count({ where: { landlordId, status: { in: ["ACTIVE", "RENEWED"] }, endDate: { lte: soon } } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd }, invoice: { lease: { landlordId } } },
    }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: { in: ["PENDING", "OVERDUE"] }, lease: { landlordId } },
    }),
    prisma.maintenanceRequest.count({
      where: { property: { landlordId }, status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } },
    }),
    prisma.complaint.count({ where: { property: { landlordId }, status: { in: ["OPEN", "REOPENED", "RESPONDED"] } } }),
    prisma.rating.aggregate({ _avg: { stars: true }, where: { rateeId: landlordId, status: "VISIBLE" } }),
    prisma.application.count({ where: { status: "PENDING", property: { landlordId } } }),
    prisma.visit.count({ where: { status: "PENDING", property: { landlordId } } }),
    prisma.inquiryMessage.count({ where: { fromGuest: true, readByLandlord: false, inquiry: { landlordId } } }),
    prisma.property.findMany({
      where: { landlordId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, name: true, address: true, rentAmount: true, approved: true, listedPublic: true,
        documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
      },
    }),
  ]);

  const occupiedSet = new Set(occupiedProps.map((l) => l.propertyId));
  const occupiedCount = occupiedProps.length;
  const vacantCount = Math.max(0, totalProperties - occupiedCount);
  const totalRequests = pendingApps + pendingVisits + newEnquiries;

  const stats = [
    { label: "Total Properties", value: formatNumber(totalProperties), href: "/landlord/properties" },
    { label: "Occupied", value: formatNumber(occupiedCount), hint: `of ${formatNumber(totalProperties)} properties`, href: "/landlord/properties" },
    { label: "Vacant", value: formatNumber(vacantCount), hint: `of ${formatNumber(totalProperties)} properties`, href: "/landlord/properties" },
    { label: "Active Tenants", value: formatNumber(activeTenants), href: "/landlord/tenants" },
    { label: "Lease Expiry Alerts", value: formatNumber(expiringSoon), hint: "≤ 30 days", href: "/landlord/leases" },
    { label: "Monthly Collection", value: formatMoney(monthCollection._sum.amount), hint: monthLabel, href: "/landlord/rent" },
    { label: "Pending Payments", value: formatMoney(pendingPayments._sum.amount), href: "/landlord/rent" },
    { label: "Maintenance", value: formatNumber(openMaintenance), hint: "open", href: "/landlord/maintenance" },
    { label: "Complaints", value: formatNumber(openComplaints), hint: "open", href: "/landlord/complaints" },
    { label: "Avg Rating", value: avgRating._avg.stars ? avgRating._avg.stars.toFixed(1) : "—", hint: "out of 5", href: "/landlord/reviews" },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Your portfolio · {monthLabel}</p>

      {!me?.verified && (
        <Link href="/landlord/verification" className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Your account isn&apos;t verified yet. Upload your Aadhaar &amp; property photo →
        </Link>
      )}

      {/* Incoming requests summary */}
      <Link
        href="/landlord/requests"
        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
          totalRequests > 0 ? "border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl text-white">📥</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {totalRequests > 0 ? `${totalRequests} request${totalRequests === 1 ? "" : "s"} need your attention` : "Requests"}
            </p>
            <p className="text-xs text-slate-500">
              {formatNumber(pendingApps)} application{pendingApps === 1 ? "" : "s"} · {formatNumber(pendingVisits)} visit{pendingVisits === 1 ? "" : "s"} · {formatNumber(newEnquiries)} new enquir{newEnquiries === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-medium text-blue-600">Open inbox →</span>
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="block rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md">
            <StatCard tone="light" label={s.label} value={s.value} hint={s.hint} />
          </Link>
        ))}
      </div>

      {/* Your properties — photo cards */}
      {recentProperties.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your properties</h2>
            <Link href="/landlord/properties" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {recentProperties.map((p) => {
              const url = p.documents[0] ? `/api/files/${p.documents[0].id}` : null;
              const occupied = occupiedSet.has(p.id);
              return (
                <Link key={p.id} href={`/landlord/properties/${p.id}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-square bg-slate-100">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">🏢</div>
                    )}
                    <span className="absolute left-1.5 top-1.5">
                      <Badge tone={occupied ? "green" : "amber"}>{occupied ? "Occupied" : "Vacant"}</Badge>
                    </span>
                    {!p.approved && <span className="absolute right-1.5 top-1.5"><Badge tone="slate">Pending</Badge></span>}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-1 text-xs font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs font-bold text-slate-900">{formatMoney(p.rentAmount)}<span className="font-normal text-slate-400">/mo</span></p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <QuickLink href="/landlord/properties/new" label="Add Property" icon="🏢" />
          <QuickLink href="/landlord/tenants/new" label="Add Tenant" icon="👤" />
          <QuickLink href="/landlord/leases/new" label="New Lease" icon="📄" />
          <QuickLink href="/landlord/rent" label="Collect Rent" icon="💳" />
          <QuickLink href="/landlord/maintenance" label="Maintenance" icon="🔧" />
          <QuickLink href="/landlord/complaints" label="Complaints" icon="📣" />
          <QuickLink href="/landlord/reviews" label="Rate Tenants" icon="⭐" />
          <QuickLink href="/landlord/properties" label="Properties" icon="🏠" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:bg-blue-50">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </Link>
  );
}
