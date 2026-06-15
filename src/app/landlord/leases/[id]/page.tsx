import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn, inputClass } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { LeaseStatusBadge } from "@/app/master-admin/leases/LeaseStatusBadge";
import { ImageUploader } from "@/components/ImageUploader";
import { LandlordLeaseForm } from "../LandlordLeaseForm";
import { approveLease, renewLease, terminateLease, deleteLeaseDocument, giveNotice } from "../actions";

export const dynamic = "force-dynamic";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default async function LandlordLeaseDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  const landlordId = session!.user.id;

  const lease = await prisma.lease.findFirst({
    where: { id, landlordId },
    include: {
      property: { select: { id: true, name: true } },
      tenant: { select: { fullName: true } },
      documents: { where: { type: "LEASE" }, orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { periodMonth: "desc" } },
    },
  });
  if (!lease) notFound();

  const [properties, tenants] = await Promise.all([
    prisma.property.findMany({ where: { landlordId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "TENANT", landlordId }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  const now = new Date();
  const isLive = lease.status === "ACTIVE" || lease.status === "RENEWED";
  const daysLeft = Math.ceil((lease.endDate.getTime() - now.getTime()) / 86400000);
  const renewDefault = ymd(new Date(lease.endDate.getFullYear() + 1, lease.endDate.getMonth(), lease.endDate.getDate()));

  return (
    <div className="space-y-5">
      <div className="text-sm"><Link href="/landlord/leases" className="text-blue-600 hover:text-blue-700">← Back to leases</Link></div>
      {sp.uploaded && <Banner tone="green">Contract saved.</Banner>}
      {sp.error === "nofile" && <Banner tone="amber">Please choose a file.</Banner>}
      {sp.error === "toobig" && <Banner tone="amber">File too large (max 8 MB).</Banner>}
      {sp.error === "baddate" && <Banner tone="amber">Provide a valid renewal date.</Banner>}

      {lease.noticeGivenAt && (
        <Banner tone="amber">
          Notice given by {lease.noticeByParty === "TENANT" ? "tenant" : "landlord"} — lease ends{" "}
          {(lease.noticeEffectiveDate ?? lease.endDate).toLocaleDateString("en-US")}
        </Banner>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{lease.property.name}</h1>
          <p className="text-sm text-slate-500">{lease.tenant.fullName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <LeaseStatusBadge status={lease.status} />
            {isLive && lease.endDate < now && <Badge tone="red">Expired</Badge>}
            {isLive && lease.endDate >= now && daysLeft <= 30 && <Badge tone="amber">Expiring in {daysLeft}d</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lease.status === "DRAFT" && (
            <form action={approveLease}><input type="hidden" name="id" value={lease.id} /><button className={btn("primary")}>Activate</button></form>
          )}
          {isLive && lease.noticeGivenAt === null && (
            <form action={giveNotice}><input type="hidden" name="id" value={lease.id} /><button className={btn("secondary")}>Give notice to terminate</button></form>
          )}
          {isLive && (
            <form action={terminateLease}><input type="hidden" name="id" value={lease.id} /><ConfirmButton message="Terminate this lease?" className={btn("danger")}>Terminate</ConfirmButton></form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Monthly Rent" value={formatMoney(lease.monthlyRent)} />
        <StatCard tone="light" label="Security Deposit" value={formatMoney(lease.securityDeposit)} />
        <StatCard tone="light" label={isLive ? "Days Remaining" : "Status"} value={isLive ? (daysLeft > 0 ? formatNumber(daysLeft) : "0") : lease.status.charAt(0) + lease.status.slice(1).toLowerCase()} />
        <StatCard tone="light" label="Invoices" value={formatNumber(lease.invoices.length)} />
        <StatCard tone="light" label="Maintenance Fee" value={lease.maintenanceFee != null ? formatMoney(lease.maintenanceFee) : "—"} />
        <StatCard tone="light" label="Notice Period" value={`${lease.noticePeriodDays} days`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Lease details</h3>
            <Card>
              <LandlordLeaseForm
                mode="edit"
                properties={properties}
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
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Invoices</h3>
            <Card className="p-0">
              {lease.invoices.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No invoices yet. Generate them from Rent.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-2 font-medium">Period</th><th className="px-4 py-2 font-medium">Amount</th><th className="px-4 py-2 font-medium">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lease.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-2 text-slate-700">{inv.periodMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-2 text-slate-700">{formatMoney(inv.amount)}</td>
                        <td className="px-4 py-2"><Badge tone={inv.status === "PAID" ? "green" : inv.status === "OVERDUE" ? "red" : inv.status === "CANCELLED" ? "slate" : "amber"}>{inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>

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
                      <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:text-blue-700">{d.label ?? "Contract"}</a>
                      <form action={deleteLeaseDocument}><input type="hidden" name="docId" value={d.id} /><ConfirmButton message="Delete this document?" className="text-xs text-red-500 hover:text-red-600">remove</ConfirmButton></form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <ImageUploader purpose="lease-contract" refId={lease.id} accept="image/*,application/pdf" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls = tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
