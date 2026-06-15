import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { formatMoneyCompact, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h2>
  );
}

export default async function AdminHome() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const [
    landlords,
    tenants,
    properties,
    occupied,
    vacant,
    activeLeases,
    monthlyRevenue,
    pendingRent,
    maintenanceOpen,
    maintenanceTotal,
    complaintsOpen,
    complaintsTotal,
    reviewsTotal,
    reviewsVisibleAgg,
    reviewsFlagged,
    recommendCount,
    pendingLandlords,
    pendingProperties,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "LANDLORD" } }),
    prisma.user.count({ where: { role: "TENANT" } }),
    prisma.property.count(),
    prisma.property.count({ where: { availability: "OCCUPIED" } }),
    prisma.property.count({ where: { availability: { not: "OCCUPIED" } } }),
    prisma.lease.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", paidAt: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: { in: ["PENDING", "OVERDUE"] } },
    }),
    prisma.maintenanceRequest.count({
      where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } },
    }),
    prisma.maintenanceRequest.count(),
    prisma.complaint.count({ where: { status: { in: ["OPEN", "REOPENED", "RESPONDED"] } } }),
    prisma.complaint.count(),
    prisma.rating.count(),
    prisma.rating.aggregate({ _avg: { stars: true }, _count: true, where: { status: "VISIBLE" } }),
    prisma.rating.count({ where: { status: "FLAGGED" } }),
    prisma.rating.count({ where: { status: "VISIBLE", recommend: true } }),
    prisma.user.count({ where: { role: "LANDLORD", status: "PENDING" } }),
    prisma.property.count({ where: { approved: false } }),
  ]);

  const avgStars = reviewsVisibleAgg._avg.stars;
  const visibleCount = reviewsVisibleAgg._count;
  const recommendRate = visibleCount ? Math.round((recommendCount / visibleCount) * 100) : 0;
  const approvals = [
    { label: "Landlords awaiting approval", count: pendingLandlords, href: "/master-admin/users?role=LANDLORD&status=PENDING" },
    { label: "Properties awaiting approval", count: pendingProperties, href: "/master-admin/properties?approval=PENDING" },
    { label: "Flagged reviews", count: reviewsFlagged, href: "/master-admin/reviews?status=FLAGGED" },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Platform overview · {monthLabel}</p>

      {/* ===== Approvals needed ===== */}
      {approvals.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Action needed
          </h2>
          <div className="flex flex-wrap gap-2">
            {approvals.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                {a.label}
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{a.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Overview metrics ===== */}
      <section>
        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard tone="light" label="Landlords" value={formatNumber(landlords)} />
          <StatCard tone="light" label="Tenants" value={formatNumber(tenants)} />
          <StatCard tone="light" label="Properties" value={formatNumber(properties)} />
          <StatCard tone="light" label="Active Leases" value={formatNumber(activeLeases)} />
          <StatCard tone="light" label="Occupied" value={formatNumber(occupied)} hint="properties" />
          <StatCard tone="light" label="Vacant" value={formatNumber(vacant)} hint="properties" />
        </div>
      </section>

      {/* ===== Main split: financials/operations + ratings side panel ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <SectionHeader>Financials</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                tone="light"
                label="Monthly Revenue"
                value={formatMoneyCompact(monthlyRevenue._sum.amount)}
                hint={monthLabel}
              />
              <StatCard
                tone="light"
                label="Pending Rent"
                value={formatMoneyCompact(pendingRent._sum.amount)}
                hint="to be collected"
              />
            </div>
          </section>

          <section>
            <SectionHeader>Operations</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                tone="light"
                label="Maintenance Requests"
                value={formatNumber(maintenanceOpen)}
                hint={`${formatNumber(maintenanceTotal)} total · open`}
              />
              <StatCard
                tone="light"
                label="Complaints"
                value={formatNumber(complaintsOpen)}
                hint={`${formatNumber(complaintsTotal)} total · open`}
              />
            </div>
          </section>
        </div>

        {/* ===== Ratings & Reviews panel ===== */}
        <section className="lg:col-span-1">
          <SectionHeader>Ratings &amp; Reviews</SectionHeader>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {avgStars ? avgStars.toFixed(1) : "—"}
                  <span className="text-sm text-amber-500"> ★</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Avg rating</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{formatNumber(reviewsTotal)}</p>
                <p className="mt-1 text-xs text-slate-500">Total reviews</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{recommendRate}%</p>
                <p className="mt-1 text-xs text-slate-500">Recommend</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm">
                {reviewsFlagged > 0 ? (
                  <span className="font-medium text-amber-600">⚑ {reviewsFlagged} flagged</span>
                ) : (
                  <span className="text-slate-400">No flagged reviews</span>
                )}
              </span>
              <Link href="/master-admin/reviews" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Moderate →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
