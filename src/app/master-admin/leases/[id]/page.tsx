import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn, inputClass } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { actionLabel, timeAgo } from "@/lib/activity";
import { ImageUploader } from "@/components/ImageUploader";
import { LeaseForm } from "../LeaseForm";
import { LeaseStatusBadge } from "../LeaseStatusBadge";
import {
  approveLease,
  renewLease,
  terminateLease,
  deleteLeaseDocument,
} from "../actions";

export const dynamic = "force-dynamic";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function LeaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const lease = await prisma.lease.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true } },
      tenant: { select: { fullName: true, email: true } },
      landlord: { select: { fullName: true } },
      documents: { where: { type: "LEASE" }, orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { periodMonth: "desc" } },
    },
  });
  if (!lease) notFound();

  const [properties, tenants, collected, activity] = await Promise.all([
    prisma.property.findMany({
      select: { id: true, name: true, landlord: { select: { fullName: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "TENANT" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", invoice: { leaseId: id } },
    }),
    prisma.auditLog.findMany({
      where: { entity: "Lease", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const now = new Date();
  const isLive = lease.status === "ACTIVE" || lease.status === "RENEWED";
  const daysLeft = Math.ceil((lease.endDate.getTime() - now.getTime()) / 86400000);
  const renewDefault = ymd(new Date(lease.endDate.getFullYear() + 1, lease.endDate.getMonth(), lease.endDate.getDate()));

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/master-admin/leases" className="text-blue-600 hover:text-blue-700">
          ← Back to leases
        </Link>
      </div>

      {sp.uploaded && <Banner tone="green">Contract saved.</Banner>}
      {sp.error === "nofile" && <Banner tone="amber">Please choose a file to upload.</Banner>}
      {sp.error === "toobig" && <Banner tone="amber">File is too large (max 8 MB).</Banner>}
      {sp.error === "baddate" && <Banner tone="amber">Please provide a valid renewal date.</Banner>}

      {lease.noticeGivenAt && (
        <Banner tone="amber">
          Notice given by {lease.noticeByParty === "TENANT" ? "tenant" : "landlord"} — lease ends{" "}
          {(lease.noticeEffectiveDate ?? lease.endDate).toLocaleDateString("en-US")}
        </Banner>
      )}

      {/* Header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{lease.property.name}</h2>
          <p className="text-sm text-slate-500">
            {lease.tenant.fullName} · landlord {lease.landlord.fullName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <LeaseStatusBadge status={lease.status} />
            {isLive && lease.endDate < now && <Badge tone="red">Expired</Badge>}
            {isLive && lease.endDate >= now && daysLeft <= 30 && <Badge tone="amber">Expiring in {daysLeft}d</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lease.status === "DRAFT" && (
            <form action={approveLease}>
              <input type="hidden" name="id" value={lease.id} />
              <button className={btn("primary")}>Approve</button>
            </form>
          )}
          {isLive && (
            <form action={terminateLease}>
              <input type="hidden" name="id" value={lease.id} />
              <ConfirmButton message="Terminate this lease?" className={btn("danger")}>
                Terminate
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Monthly Rent" value={formatMoney(lease.monthlyRent)} />
        <StatCard tone="light" label="Security Deposit" value={formatMoney(lease.securityDeposit)} />
        <StatCard
          tone="light"
          label={isLive ? "Days Remaining" : "Status"}
          value={isLive ? (daysLeft > 0 ? formatNumber(daysLeft) : "0") : lease.status.charAt(0) + lease.status.slice(1).toLowerCase()}
        />
        <StatCard tone="light" label="Collected" value={formatMoney(collected._sum.amount)} hint={`${lease.invoices.length} invoices`} />
        <StatCard tone="light" label="Maintenance Fee" value={lease.maintenanceFee != null ? formatMoney(lease.maintenanceFee) : "—"} />
        <StatCard tone="light" label="Notice Period" value={`${lease.noticePeriodDays} days`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Edit + renew */}
        <div className="space-y-5 lg:col-span-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Lease details</h3>
            <Card>
              <LeaseForm
                mode="edit"
                properties={properties.map((p) => ({ id: p.id, name: p.name, landlordName: p.landlord.fullName }))}
                tenants={tenants}
                defaults={{
                  id: lease.id,
                  propertyId: lease.property.id,
                  tenantId: lease.tenantId,
                  startDate: ymd(lease.startDate),
                  endDate: ymd(lease.endDate),
                  monthlyRent: lease.monthlyRent.toString(),
                  securityDeposit: lease.securityDeposit.toString(),
                  maintenanceFee: lease.maintenanceFee != null ? lease.maintenanceFee.toString() : undefined,
                  noticePeriodDays: lease.noticePeriodDays.toString(),
                  terms: lease.terms ?? undefined,
                  status: lease.status,
                }}
              />
            </Card>
          </div>

          {/* Invoices */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Invoices</h3>
            <Card className="p-0">
              {lease.invoices.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No invoices for this lease yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Period</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                      <th className="px-4 py-2 font-medium">Due</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lease.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-2 text-slate-700">
                          {inv.periodMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{formatMoney(inv.amount)}</td>
                        <td className="px-4 py-2 text-slate-500">{inv.dueDate.toLocaleDateString("en-US")}</td>
                        <td className="px-4 py-2">
                          <Badge tone={inv.status === "PAID" ? "green" : inv.status === "OVERDUE" ? "red" : inv.status === "CANCELLED" ? "slate" : "amber"}>
                            {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>

        {/* Side: renew + contract + activity */}
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Renew lease</h3>
            <Card>
              <form action={renewLease} className="space-y-2">
                <input type="hidden" name="id" value={lease.id} />
                <label className="block text-sm text-slate-600">New end date</label>
                <input type="date" name="endDate" defaultValue={renewDefault} className={inputClass + " w-full"} />
                <button className={btn("secondary", "w-full")}>Renew lease</button>
              </form>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Signed contract</h3>
            <Card>
              {lease.documents.length === 0 ? (
                <p className="text-sm text-slate-400">No contract uploaded.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {lease.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:text-blue-700">
                        {d.label ?? "Contract"}
                      </a>
                      <form action={deleteLeaseDocument}>
                        <input type="hidden" name="docId" value={d.id} />
                        <ConfirmButton message="Delete this document?" className="text-xs text-red-500 hover:text-red-600">
                          remove
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <ImageUploader purpose="lease-contract" refId={lease.id} accept="image/*,application/pdf" />
              </div>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent activity</h3>
            <Card>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="text-slate-700">{actionLabel(a.action)}</span>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
