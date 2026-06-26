import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
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
    prisma.notification.findMany({ where: { userId: tenantId }, orderBy: { createdAt: "desc" }, take: 4 }),
    // Photo-rich discovery row: live, public, available homes.
    prisma.property.findMany({
      where: { approved: true, listedPublic: true, availability: "AVAILABLE", NOT: lease ? { id: lease.propertyId } : undefined },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, address: true, type: true, ref: true, rentAmount: true, documents: PHOTO },
    }),
  ]);

  const heroPhoto = lease ? photoUrl(lease.property.documents) : null;

  return (
    <div className="space-y-5">
      {/* Residence hero — now with the property photo */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid sm:grid-cols-[16rem_1fr]">
          <div className="relative h-44 bg-slate-100 sm:h-auto">
            {heroPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroPhoto} alt={lease!.property.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl text-slate-300">🏠</div>
            )}
          </div>
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Your residence</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{lease?.property.name ?? "No active lease"}</p>
            {lease ? (
              <>
                <p className="text-sm text-slate-500">{lease.property.address} · landlord {lease.landlord.fullName}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {lease.property.rooms != null && <Badge tone="slate">{lease.property.rooms} bd</Badge>}
                  {lease.property.bathrooms != null && <Badge tone="slate">{lease.property.bathrooms} ba</Badge>}
                  {lease.property.areaSqft != null && <Badge tone="slate">{formatNumber(lease.property.areaSqft)} sq ft</Badge>}
                </div>
                {/* Lease progress */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{lease.startDate.toLocaleDateString("en-US")}</span>
                    <span>{lease.endDate.toLocaleDateString("en-US")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round(leaseProgress(lease.startDate, lease.endDate) * 100)}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link href="/tenant/lease" className="font-medium text-blue-600 hover:text-blue-700">View lease →</Link>
                  <Link href="/tenant/chat" className="font-medium text-blue-600 hover:text-blue-700">Message landlord →</Link>
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Browse available homes below to get started.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard tone="light" label="Next Rent Due" value={nextInvoice ? formatMoney(nextInvoice.amount) : "—"} hint={nextInvoice ? nextInvoice.dueDate.toLocaleDateString("en-US") : "nothing due"} />
        <StatCard tone="light" label="Monthly Rent" value={lease ? formatMoney(lease.monthlyRent) : "—"} />
        <StatCard tone="light" label="Total Paid" value={formatMoney(paidAgg._sum.amount)} hint={`${formatNumber(paidAgg._count)} payments`} />
        <StatCard tone="light" label="Maintenance" value={formatNumber(openMaintenance)} hint="open" />
        <StatCard tone="light" label="Complaints" value={formatNumber(openComplaints)} hint="open" />
        <StatCard tone="light" label="My Rating" value={ratingAgg._avg.stars ? ratingAgg._avg.stars.toFixed(1) : "—"} hint="out of 5" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {nextInvoice && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Rent due: {formatMoney(nextInvoice.amount)}</p>
            <p className="text-xs text-blue-700">Due by {nextInvoice.dueDate.toLocaleDateString("en-US")}</p>
            <Link href="/tenant/payments" className="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Pay now
            </Link>
          </div>
        )}

        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</h2>
          <Card>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400">No notifications.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notifications.map((n) => (
                  <li key={n.id} className={`flex items-start gap-2 ${n.read ? "text-slate-500" : "text-slate-800"}`}>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                    <span>
                      <span className="font-medium">{n.title}</span>
                      {n.body && <span className="block text-xs text-slate-400">{n.body}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/tenant/notifications" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">View all →</Link>
          </Card>
        </div>
      </div>

      {/* Photo-rich discovery row */}
      {discover.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Homes you might like</h2>
            <Link href="/listings" className="text-sm font-medium text-blue-600 hover:text-blue-700">Browse all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {discover.map((p) => {
              const url = photoUrl(p.documents);
              return (
                <Link key={p.id} href={propertyPath(p)} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="aspect-square bg-slate-100">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">🏠</div>
                    )}
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
    </div>
  );
}
