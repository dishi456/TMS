import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TenantHome() {
  const session = await auth();
  const tenantId = session!.user.id;

  const lease = await prisma.lease.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "RENEWED"] } },
    include: { property: { select: { name: true, address: true } }, landlord: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const [nextInvoice, paidAgg, openMaintenance, openComplaints, ratingAgg, notifications] = await Promise.all([
    prisma.invoice.findFirst({
      where: { lease: { tenantId }, status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { tenantId, status: "SUCCESS" } }),
    prisma.maintenanceRequest.count({ where: { tenantId, status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.complaint.count({ where: { tenantId, status: { in: ["OPEN", "REOPENED", "RESPONDED"] } } }),
    prisma.rating.aggregate({ _avg: { stars: true }, where: { rateeId: tenantId, status: "VISIBLE" } }),
    prisma.notification.findMany({ where: { userId: tenantId }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  return (
    <div className="space-y-5">
      {/* Property + lease summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Your residence</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">{lease?.property.name ?? "No active lease"}</p>
        {lease && (
          <p className="text-sm text-slate-500">
            {lease.property.address} · landlord {lease.landlord.fullName}
          </p>
        )}
        {lease && (
          <p className="mt-1 text-xs text-slate-400">
            Lease {lease.startDate.toLocaleDateString("en-US")} – {lease.endDate.toLocaleDateString("en-US")}
            {" · "}<Link href="/tenant/lease" className="text-blue-600 hover:text-blue-700">View lease →</Link>
          </p>
        )}
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
    </div>
  );
}
