import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { approveTenant, setTenantStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function TenantMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const landlordId = session!.user.id;

  const tenant = await prisma.user.findFirst({
    where: { id, role: "TENANT", landlordId },
  });
  if (!tenant) notFound();

  const [paid, payments, maintenance, complaints, ratingReceived, leases] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { tenantId: id, status: "SUCCESS" } }),
    prisma.payment.findMany({
      where: { tenantId: id },
      include: { invoice: { include: { lease: { include: { property: { select: { name: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.maintenanceRequest.findMany({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.complaint.findMany({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.rating.aggregate({ _avg: { stars: true }, _count: true, where: { rateeId: id, status: "VISIBLE" } }),
    prisma.lease.count({ where: { tenantId: id, landlordId } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/landlord/tenants" className="text-blue-600 hover:text-blue-700">← Back to tenants</Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
            {tenant.fullName.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{tenant.fullName}</h1>
            <p className="text-sm text-slate-500">{tenant.email}{tenant.phone ? ` · ${tenant.phone}` : ""}</p>
            <div className="mt-1">
              {tenant.status === "ACTIVE" ? <Badge tone="green">Active</Badge> : tenant.status === "PENDING" ? <Badge tone="amber">Pending</Badge> : <Badge tone="red">Suspended</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {tenant.status === "PENDING" ? (
            <form action={approveTenant}>
              <input type="hidden" name="id" value={tenant.id} />
              <button className={btn("primary")}>Approve</button>
            </form>
          ) : (
            <form action={setTenantStatus}>
              <input type="hidden" name="id" value={tenant.id} />
              <input type="hidden" name="status" value={tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
              <button className={btn("secondary")}>{tenant.status === "ACTIVE" ? "Suspend" : "Activate"}</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Leases" value={formatNumber(leases)} />
        <StatCard tone="light" label="Rent Paid" value={formatMoney(paid._sum.amount)} hint={`${formatNumber(paid._count)} payments`} />
        <StatCard tone="light" label="Avg Rating" value={ratingReceived._avg.stars ? ratingReceived._avg.stars.toFixed(1) : "—"} hint={`${formatNumber(ratingReceived._count)} reviews`} />
        <StatCard tone="light" label="Govt ID" value={tenant.governmentId ? "On file" : "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Payment history</h3>
          <Card className="p-0">
            {payments.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No payments yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Property</th><th className="px-4 py-2 font-medium">Amount</th><th className="px-4 py-2 font-medium">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-slate-500">{(p.paidAt ?? p.createdAt).toLocaleDateString("en-US")}</td>
                      <td className="px-4 py-2 text-slate-600">{p.invoice.lease.property.name}</td>
                      <td className="px-4 py-2 text-slate-700">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-2">
                        <Badge tone={p.status === "SUCCESS" ? "green" : p.status === "REFUNDED" ? "slate" : p.status === "FAILED" ? "red" : "amber"}>
                          {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Maintenance</h3>
            <Card>
              {maintenance.length === 0 ? <p className="text-sm text-slate-400">None.</p> : (
                <ul className="space-y-1.5 text-sm">{maintenance.map((m) => <li key={m.id} className="truncate text-slate-700">{m.title}</li>)}</ul>
              )}
            </Card>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Complaints</h3>
            <Card>
              {complaints.length === 0 ? <p className="text-sm text-slate-400">None.</p> : (
                <ul className="space-y-1.5 text-sm">{complaints.map((c) => <li key={c.id} className="truncate text-slate-700">{c.subject}</li>)}</ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
