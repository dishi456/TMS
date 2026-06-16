import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge, btn } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { formatMoney } from "@/lib/format";
import { LeaseStatusBadge } from "@/app/master-admin/leases/LeaseStatusBadge";
import { PropertyFeatures } from "@/components/PropertyFeatures";
import { giveNotice } from "./actions";

export const metadata: Metadata = { title: "Lease" };
export const dynamic = "force-dynamic";

export default async function TenantLeasePage() {
  const session = await auth();
  const tenantId = session!.user.id;

  const leases = await prisma.lease.findMany({
    where: { tenantId },
    include: {
      property: {
        select: {
          ref: true, name: true, address: true, noticePeriodDays: true,
          rooms: true, bathrooms: true, balconies: true, floor: true, totalFloors: true,
          areaSqft: true, furnishing: true, hasLobby: true, hasParking: true, hasLift: true,
          powerBackup: true, amenities: true,
        },
      },
      landlord: { select: { fullName: true } },
      documents: { where: { type: "LEASE" }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { startDate: "desc" },
  });

  const current = leases.find((l) => l.status === "ACTIVE" || l.status === "RENEWED") ?? leases[0];

  if (!current) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
        You don&apos;t have a lease on record yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-800">Lease Information</h1>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">Property ID: {current.property.ref ?? "—"}</span>
        </div>
        <p className="text-sm text-slate-500">{current.property.name} · {current.property.address}</p>
        <div className="mt-1"><LeaseStatusBadge status={current.status} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Monthly Rent" value={formatMoney(current.monthlyRent)} />
        <StatCard tone="light" label="Security Deposit" value={formatMoney(current.securityDeposit)} />
        <StatCard tone="light" label="Start Date" value={current.startDate.toLocaleDateString("en-US")} />
        <StatCard tone="light" label="End Date" value={current.endDate.toLocaleDateString("en-US")} />
        <StatCard tone="light" label="Maintenance Fee" value={current.maintenanceFee != null ? formatMoney(current.maintenanceFee) : "—"} />
        <StatCard tone="light" label="Lease Notice Period" value={`${current.noticePeriodDays} days`} />
        <StatCard tone="light" label="Property Notice Period" value={`${current.property.noticePeriodDays} days`} hint="landlord default" />
      </div>

      {current.noticeGivenAt ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Notice given by {current.noticeByParty === "TENANT" ? "tenant" : "landlord"} — lease ends{" "}
          {(current.noticeEffectiveDate ?? current.endDate).toLocaleDateString("en-US")}
        </div>
      ) : (
        (current.status === "ACTIVE" || current.status === "RENEWED") && (
          <form action={giveNotice}>
            <input type="hidden" name="id" value={current.id} />
            <button className={btn("secondary")}>Give notice to vacate</button>
          </form>
        )
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Property features &amp; layout</h2>
        <Card><PropertyFeatures p={current.property} /></Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Terms &amp; conditions</h2>
          <Card>
            {current.terms ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{current.terms}</p>
            ) : (
              <p className="text-sm text-slate-400">No specific terms recorded.</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
              <div><dt className="text-slate-400">Landlord</dt><dd className="text-slate-800">{current.landlord.fullName}</dd></div>
              <div><dt className="text-slate-400">Property</dt><dd className="text-slate-800">{current.property.name}</dd></div>
            </dl>
          </Card>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Lease agreement</h2>
          <Card>
            {current.documents.length === 0 ? (
              <p className="text-sm text-slate-400">No signed contract uploaded yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {current.documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                      {d.label ?? "Lease agreement"}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {leases.length > 1 && (
            <div className="mt-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Past leases</h2>
              <Card>
                <ul className="space-y-2 text-sm">
                  {leases.filter((l) => l.id !== current.id).map((l) => (
                    <li key={l.id} className="flex items-center justify-between">
                      <span className="text-slate-600">{l.startDate.toLocaleDateString("en-US")}–{l.endDate.toLocaleDateString("en-US")}</span>
                      <Badge tone="slate">{l.status.charAt(0) + l.status.slice(1).toLowerCase()}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
