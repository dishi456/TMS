import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { GradientStat } from "@/components/GradientStat";
import { NotificationFeed } from "@/components/NotificationFeed";
import { PropertyImage } from "@/components/PropertyImage";
import { formatMoney, formatNumber } from "@/lib/format";
import { propertyPath } from "@/lib/property-path";

export const dynamic = "force-dynamic";

const PHOTO = { where: { type: "PHOTO" as const }, orderBy: { createdAt: "asc" as const }, take: 1, select: { id: true } };
function photoUrl(docs: { id: string }[]): string | null {
  return docs[0] ? `/api/files/${docs[0].id}` : null;
}

// Fraction (0–1) of the lease term elapsed, for the progress bar.
function leaseProgress(start: Date, end: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (Date.now() - start.getTime()) / total));
}

export default async function TenantHome() {
  const session = await auth();
  const tenantId = session!.user.id;
  const firstName = (session?.user?.name ?? "there").split(" ")[0];

  const lease = await prisma.lease.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "RENEWED"] } },
    include: {
      property: { select: { id: true, name: true, address: true, type: true, ref: true, rooms: true, bathrooms: true, areaSqft: true, documents: PHOTO } },
      landlord: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const [nextInvoice, paidAgg, openMaintenance, openComplaints, ratingAgg, notifications, discover] = await Promise.all([
    prisma.invoice.findFirst({
      where: { lease: { tenantId }, status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { tenantId, status: "SUCCESS" } }),
    prisma.maintenanceRequest.count({ where: { tenantId, status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.complaint.count({ where: { tenantId, status: { in: ["OPEN", "REOPENED", "RESPONDED"] } } }),
    prisma.rating.aggregate({ _avg: { stars: true }, where: { rateeId: tenantId, status: "VISIBLE" } }),
    prisma.notification.findMany({ where: { userId: tenantId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.property.findMany({
      where: { approved: true, listedPublic: true, availability: "AVAILABLE", NOT: lease ? { id: lease.propertyId } : undefined },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, address: true, type: true, ref: true, rentAmount: true, documents: PHOTO },
    }),
  ]);

  const heroPhoto = lease ? photoUrl(lease.property.documents) : null;
  const progress = lease ? Math.round(leaseProgress(lease.startDate, lease.endDate) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Residence hero with gradient accent */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid sm:grid-cols-[18rem_1fr]">
          <div className="relative h-48 bg-slate-100 sm:h-auto">
            <PropertyImage src={heroPhoto} alt={lease?.property.name ?? "Property"} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-black/10" />
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Welcome back, {firstName} 👋</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{lease?.property.name ?? "No active lease"}</p>
            {lease ? (
              <>
                <p className="text-sm text-slate-500">{lease.property.address} · landlord {lease.landlord.fullName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {lease.property.rooms != null && <Badge tone="sky">{lease.property.rooms} bd</Badge>}
                  {lease.property.bathrooms != null && <Badge tone="sky">{lease.property.bathrooms} ba</Badge>}
                  {lease.property.areaSqft != null && <Badge tone="slate">{formatNumber(lease.property.areaSqft)} sq ft</Badge>}
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Lease progress · {progress}%</span>
                    <span>{lease.startDate.toLocaleDateString("en-US")} → {lease.endDate.toLocaleDateString("en-US")}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/tenant/lease" className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5">View lease</Link>
                  <Link href="/tenant/chat" className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Message landlord</Link>
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Browse available homes below to get started.</p>
            )}
          </div>
        </div>
      </div>

      {/* Gradient KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <GradientStat label="Next Rent Due" icon="📅" gradient="from-rose-500 to-red-500" value={nextInvoice ? formatMoney(nextInvoice.amount) : "—"} hint={nextInvoice ? `by ${nextInvoice.dueDate.toLocaleDateString("en-US")}` : "nothing due"} href="/tenant/payments" />
        <GradientStat label="Monthly Rent" icon="🏠" gradient="from-blue-500 to-indigo-600" value={lease ? formatMoney(lease.monthlyRent) : "—"} href="/tenant/lease" />
        <GradientStat label="Total Paid" icon="💳" gradient="from-emerald-500 to-teal-600" value={formatMoney(paidAgg._sum.amount)} hint={`${formatNumber(paidAgg._count)} payments`} href="/tenant/payments" />
        <GradientStat label="Maintenance" icon="🔧" gradient="from-amber-500 to-orange-500" value={formatNumber(openMaintenance)} hint="open" href="/tenant/maintenance" />
        <GradientStat label="Complaints" icon="📣" gradient="from-fuchsia-500 to-pink-600" value={formatNumber(openComplaints)} hint="open" href="/tenant/complaints" />
        <GradientStat label="My Rating" icon="⭐" gradient="from-violet-500 to-purple-600" value={ratingAgg._avg.stars ? ratingAgg._avg.stars.toFixed(1) : "—"} hint="out of 5" href="/tenant/reviews" />
      </div>

      {/* Rent-due callout + notifications */}
      <div className="grid gap-5 lg:grid-cols-2">
        {nextInvoice ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-5 text-white shadow-sm">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <p className="relative text-xs font-medium uppercase tracking-wide text-white/80">Upcoming payment</p>
            <p className="relative mt-1 text-3xl font-bold">{formatMoney(nextInvoice.amount)}</p>
            <p className="relative text-sm text-white/80">Due by {nextInvoice.dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>
            <Link href="/tenant/payments" className="relative mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-transform hover:-translate-y-0.5">Pay now →</Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <span className="text-3xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">No rent due</p>
              <p className="text-xs text-emerald-700">You&apos;re all paid up. Nice work!</p>
            </div>
          </div>
        )}

        <NotificationFeed items={notifications} href="/tenant/notifications" />
      </div>

      {/* Photo-rich discovery row */}
      {discover.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Homes you might like</h2>
            <Link href="/tenant/marketplace" className="text-sm font-medium text-blue-600 hover:text-blue-700">Browse all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {discover.map((p) => {
              const url = photoUrl(p.documents);
              return (
                <Link key={p.id} href={propertyPath(p)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="aspect-square bg-slate-100">
                    <PropertyImage src={url} alt={p.name} className="transition-transform group-hover:scale-105" />
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
    </div>
  );
}
