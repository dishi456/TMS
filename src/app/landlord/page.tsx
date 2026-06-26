import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GradientStat } from "@/components/GradientStat";
import { PropertyImage } from "@/components/PropertyImage";
import { Badge } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LandlordHome() {
  const session = await auth();
  const landlordId = session!.user.id;
  const firstName = (session?.user?.name ?? "there").split(" ")[0];

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
    { label: "Properties", value: formatNumber(totalProperties), icon: "🏢", gradient: "from-blue-500 to-indigo-600", href: "/landlord/properties" },
    { label: "Occupied", value: formatNumber(occupiedCount), hint: `of ${formatNumber(totalProperties)}`, icon: "✅", gradient: "from-emerald-500 to-teal-600", href: "/landlord/properties" },
    { label: "Vacant", value: formatNumber(vacantCount), hint: `of ${formatNumber(totalProperties)}`, icon: "🚪", gradient: "from-amber-500 to-orange-500", href: "/landlord/properties" },
    { label: "Active Tenants", value: formatNumber(activeTenants), icon: "👥", gradient: "from-cyan-500 to-blue-600", href: "/landlord/tenants" },
    { label: "Expiring Soon", value: formatNumber(expiringSoon), hint: "≤ 30 days", icon: "⏰", gradient: "from-rose-500 to-red-500", href: "/landlord/leases" },
    { label: "Collected", value: formatMoney(monthCollection._sum.amount), hint: "this month", icon: "💰", gradient: "from-green-500 to-emerald-600", href: "/landlord/rent" },
    { label: "Pending Rent", value: formatMoney(pendingPayments._sum.amount), icon: "⏳", gradient: "from-orange-500 to-amber-600", href: "/landlord/rent" },
    { label: "Maintenance", value: formatNumber(openMaintenance), hint: "open", icon: "🔧", gradient: "from-amber-500 to-yellow-600", href: "/landlord/maintenance" },
    { label: "Complaints", value: formatNumber(openComplaints), hint: "open", icon: "📣", gradient: "from-fuchsia-500 to-pink-600", href: "/landlord/complaints" },
    { label: "Avg Rating", value: avgRating._avg.stars ? avgRating._avg.stars.toFixed(1) : "—", hint: "out of 5", icon: "⭐", gradient: "from-violet-500 to-purple-600", href: "/landlord/reviews" },
  ];

  return (
    <div className="space-y-6">
      {/* Gradient welcome header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">{monthLabel}</p>
            <h1 className="mt-0.5 text-2xl font-bold">Welcome back, {firstName} 👋</h1>
            <p className="mt-1 text-sm text-white/80">Here&apos;s how your portfolio is doing today.</p>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-2xl font-bold">{formatMoney(monthCollection._sum.amount)}</p>
              <p className="text-xs text-white/70">collected this month</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{occupiedCount}<span className="text-base font-normal text-white/60">/{totalProperties}</span></p>
              <p className="text-xs text-white/70">occupied</p>
            </div>
          </div>
        </div>
      </div>

      {!me?.verified && (
        <Link href="/landlord/verification" className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-800 transition-transform hover:-translate-y-0.5">
          <span className="text-lg">⚠️</span> Your account isn&apos;t verified yet. Upload your Aadhaar &amp; property photo →
        </Link>
      )}

      {/* Incoming requests summary */}
      <Link
        href="/landlord/requests"
        className={`flex items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
          totalRequests > 0 ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${totalRequests > 0 ? "bg-white/20" : "bg-blue-600 text-white"}`}>📥</span>
          <div>
            <p className={`text-sm font-semibold ${totalRequests > 0 ? "text-white" : "text-slate-800"}`}>
              {totalRequests > 0 ? `${totalRequests} request${totalRequests === 1 ? "" : "s"} need your attention` : "No pending requests"}
            </p>
            <p className={`text-xs ${totalRequests > 0 ? "text-white/80" : "text-slate-500"}`}>
              {formatNumber(pendingApps)} application{pendingApps === 1 ? "" : "s"} · {formatNumber(pendingVisits)} visit{pendingVisits === 1 ? "" : "s"} · {formatNumber(newEnquiries)} new enquir{newEnquiries === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
        <span className={`shrink-0 text-sm font-medium ${totalRequests > 0 ? "text-white" : "text-blue-600"}`}>Open inbox →</span>
      </Link>

      {/* Gradient KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <GradientStat key={s.label} label={s.label} value={s.value} hint={s.hint} icon={s.icon} gradient={s.gradient} href={s.href} />
        ))}
      </div>

      {/* Your properties — photo cards */}
      {recentProperties.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Your properties</h2>
            <Link href="/landlord/properties" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {recentProperties.map((p) => {
              const url = p.documents[0] ? `/api/files/${p.documents[0].id}` : null;
              const occupied = occupiedSet.has(p.id);
              return (
                <Link key={p.id} href={`/landlord/properties/${p.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative aspect-square bg-slate-100">
                    <PropertyImage src={url} alt={p.name} emoji="🏢" className="transition-transform group-hover:scale-105" />
                    <span className="absolute left-1.5 top-1.5">
                      <Badge tone={occupied ? "green" : "amber"}>{occupied ? "Occupied" : "Vacant"}</Badge>
                    </span>
                    {!p.approved && <span className="absolute right-1.5 top-1.5"><Badge tone="slate">Pending</Badge></span>}
                  </div>
                  <div className="p-2.5">
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
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <QuickLink href="/landlord/properties/new" label="Add Property" icon="🏢" chip="bg-blue-100 text-blue-600" />
          <QuickLink href="/landlord/tenants/new" label="Add Tenant" icon="👤" chip="bg-emerald-100 text-emerald-600" />
          <QuickLink href="/landlord/leases/new" label="New Lease" icon="📄" chip="bg-violet-100 text-violet-600" />
          <QuickLink href="/landlord/rent" label="Collect Rent" icon="💳" chip="bg-green-100 text-green-600" />
          <QuickLink href="/landlord/maintenance" label="Maintenance" icon="🔧" chip="bg-amber-100 text-amber-600" />
          <QuickLink href="/landlord/complaints" label="Complaints" icon="📣" chip="bg-rose-100 text-rose-600" />
          <QuickLink href="/landlord/reviews" label="Rate Tenants" icon="⭐" chip="bg-yellow-100 text-yellow-600" />
          <QuickLink href="/landlord/marketplace" label="Marketplace" icon="🏠" chip="bg-indigo-100 text-indigo-600" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, label, icon, chip }: { href: string; label: string; icon: string; chip: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${chip}`}>{icon}</span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </Link>
  );
}
