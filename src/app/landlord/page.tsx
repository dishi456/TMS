import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
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
    unitsAgg,
    occupiedLeases,
    activeTenants,
    expiringSoon,
    monthCollection,
    pendingPayments,
    openMaintenance,
    openComplaints,
    avgRating,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: landlordId }, select: { verified: true } }),
    prisma.property.count({ where: { landlordId } }),
    prisma.property.aggregate({ _sum: { numberOfUnits: true }, where: { landlordId } }),
    prisma.lease.count({ where: { landlordId, status: { in: ["ACTIVE", "RENEWED"] } } }),
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
  ]);

  const totalUnits = unitsAgg._sum.numberOfUnits ?? 0;
  const vacantUnits = Math.max(0, totalUnits - occupiedLeases);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Your portfolio · {monthLabel}</p>

      {!me?.verified && (
        <Link href="/landlord/verification" className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Your account isn&apos;t verified yet. Upload your Aadhaar &amp; property photo →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard tone="light" label="Total Properties" value={formatNumber(totalProperties)} />
        <StatCard tone="light" label="Occupied Units" value={formatNumber(occupiedLeases)} hint={`${formatNumber(totalUnits)} total`} />
        <StatCard tone="light" label="Vacant Units" value={formatNumber(vacantUnits)} />
        <StatCard tone="light" label="Active Tenants" value={formatNumber(activeTenants)} />
        <StatCard tone="light" label="Lease Expiry Alerts" value={formatNumber(expiringSoon)} hint="≤ 30 days" />
        <StatCard tone="light" label="Monthly Collection" value={formatMoney(monthCollection._sum.amount)} hint={monthLabel} />
        <StatCard tone="light" label="Pending Payments" value={formatMoney(pendingPayments._sum.amount)} />
        <StatCard tone="light" label="Maintenance" value={formatNumber(openMaintenance)} hint="open" />
        <StatCard tone="light" label="Complaints" value={formatNumber(openComplaints)} hint="open" />
        <StatCard tone="light" label="Avg Rating" value={avgRating._avg.stars ? avgRating._avg.stars.toFixed(1) : "—"} hint="out of 5" />
      </div>

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
