import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { btn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { MaintenanceStatusBadge, PriorityBadge } from "./MaintenanceBadges";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

type Search = { status?: string; priority?: string; q?: string };

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : "";
  const priority = PRIORITIES.includes(sp.priority ?? "") ? sp.priority : "";
  const q = (sp.q ?? "").trim();

  const where: Prisma.MaintenanceRequestWhereInput = {
    ...(status ? { status: status as Prisma.MaintenanceRequestWhereInput["status"] } : {}),
    ...(priority ? { priority: priority as Prisma.MaintenanceRequestWhereInput["priority"] } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { property: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    include: {
      property: { select: { name: true } },
      tenant: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">
        Maintenance Requests <span className="text-slate-400">({formatNumber(requests.length)})</span>
      </h2>

      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title or property…"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}</option>
          ))}
        </select>
        <select name="priority" defaultValue={priority} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button className={btn("secondary")}>Filter</button>
        {(q || status || priority) && (
          <Link href="/master-admin/maintenance" className={btn("ghost")}>Clear</Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Request</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Assigned to</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No maintenance requests found.</td></tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/master-admin/maintenance/${r.id}`} className="font-medium text-slate-800 hover:text-blue-700">
                    {r.title}
                  </Link>
                  <div className="text-xs text-slate-400">{r.createdAt.toLocaleDateString("en-US")}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.property.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.tenant.fullName}</td>
                <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                <td className="px-4 py-3 text-slate-600">{r.assignedTo ?? "—"}</td>
                <td className="px-4 py-3"><MaintenanceStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/master-admin/maintenance/${r.id}`} className={btn("secondary", "px-2.5 py-1.5")}>
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
