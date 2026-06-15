import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { btn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { MaintenanceStatusBadge, PriorityBadge } from "@/app/master-admin/maintenance/MaintenanceBadges";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];

export default async function LandlordMaintenancePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const landlordId = session!.user.id;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : "";

  const where: Prisma.MaintenanceRequestWhereInput = {
    property: { landlordId },
    ...(status ? { status: status as Prisma.MaintenanceRequestWhereInput["status"] } : {}),
  };

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    include: { property: { select: { name: true } }, tenant: { select: { fullName: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-slate-800">
          Maintenance <span className="text-slate-400">({formatNumber(requests.length)})</span>
        </h1>
        <form className="flex gap-2">
          <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}</option>)}
          </select>
          <button className={btn("secondary")}>Filter</button>
          {status && <Link href="/landlord/maintenance" className={btn("ghost")}>Clear</Link>}
        </form>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">No maintenance requests.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/landlord/maintenance/${r.id}`} className="font-medium text-slate-800 hover:text-blue-700">{r.title}</Link>
                    <div className="text-xs text-slate-400">{r.createdAt.toLocaleDateString("en-US")}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.property.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.tenant.fullName}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                  <td className="px-4 py-3"><MaintenanceStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/landlord/maintenance/${r.id}`} className={btn("secondary", "px-2.5 py-1.5")}>Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
