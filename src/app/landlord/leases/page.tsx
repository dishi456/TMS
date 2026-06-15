import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/format";
import { LeaseStatusBadge } from "@/app/master-admin/leases/LeaseStatusBadge";
import { approveLease, terminateLease } from "./actions";

export const dynamic = "force-dynamic";

export default async function LandlordLeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const landlordId = session!.user.id;

  const leases = await prisma.lease.findMany({
    where: { landlordId },
    include: { property: { select: { name: true } }, tenant: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000);

  return (
    <div className="space-y-4">
      {sp.created && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">Lease created.</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-800">
          Leases <span className="text-slate-400">({formatNumber(leases.length)})</span>
        </h1>
        <Link href="/landlord/leases/new" className={btn("primary")}>+ New Lease</Link>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">No leases yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Rent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leases.map((l) => {
                const isLive = l.status === "ACTIVE" || l.status === "RENEWED";
                const expired = isLive && l.endDate < now;
                const expiringSoon = isLive && !expired && l.endDate <= soon;
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/landlord/leases/${l.id}`} className="font-medium text-slate-800 hover:text-blue-700">{l.property.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.tenant.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{l.startDate.toLocaleDateString("en-US")} – {l.endDate.toLocaleDateString("en-US")}</div>
                      {expired && <Badge tone="red">Expired</Badge>}
                      {expiringSoon && <Badge tone="amber">Expiring soon</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatMoney(l.monthlyRent)}</td>
                    <td className="px-4 py-3"><LeaseStatusBadge status={l.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/landlord/leases/${l.id}`} className={btn("secondary", "px-2.5 py-1.5")}>Manage</Link>
                        {l.status === "DRAFT" && (
                          <form action={approveLease}><input type="hidden" name="id" value={l.id} /><button className={btn("ghost", "px-2.5 py-1.5")}>Activate</button></form>
                        )}
                        {isLive && (
                          <form action={terminateLease}><input type="hidden" name="id" value={l.id} /><button className={btn("danger", "px-2.5 py-1.5")}>Terminate</button></form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
