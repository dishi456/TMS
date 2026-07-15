import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/format";
import { LeaseStatusBadge } from "./LeaseStatusBadge";
import { approveLease, terminateLease } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "ACTIVE", "RENEWED", "TERMINATED", "EXPIRED", "COMPLETED"];
const EXPIRY_WINDOW_DAYS = 30;

type Search = { q?: string; status?: string; created?: string };

export default async function LeasesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : "";

  const where: Prisma.LeaseWhereInput = {
    ...(status ? { status: status as Prisma.LeaseWhereInput["status"] } : {}),
    ...(q
      ? {
          OR: [
            { property: { name: { contains: q } } },
            { tenant: { fullName: { contains: q } } },
          ],
        }
      : {}),
  };

  const leases = await prisma.lease.findMany({
    where,
    include: {
      property: { select: { name: true } },
      tenant: { select: { fullName: true } },
      landlord: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 86400000);

  return (
    <div className="space-y-4">
      {sp.created && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Lease created successfully.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">
          Lease Agreements <span className="text-slate-400">({formatNumber(leases.length)})</span>
        </h2>
        <Link href="/master-admin/leases/new" className={btn("primary")}>
          + New Lease
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by property or tenant…"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button className={btn("secondary")}>Filter</button>
        {(q || status) && (
          <Link href="/master-admin/leases" className={btn("ghost")}>
            Clear
          </Link>
        )}
      </form>

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
            {leases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No leases found.
                </td>
              </tr>
            )}
            {leases.map((l) => {
              const isLive = l.status === "ACTIVE" || l.status === "RENEWED";
              const expired = isLive && l.endDate < now;
              const expiringSoon = isLive && !expired && l.endDate <= soon;
              return (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/master-admin/leases/${l.id}`} className="font-medium text-slate-800 hover:text-blue-700">
                      {l.property.name}
                    </Link>
                    <div className="text-xs text-slate-400">{l.landlord.fullName}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.tenant.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{l.startDate.toLocaleDateString("en-US")} – {l.endDate.toLocaleDateString("en-US")}</div>
                    {expired && <Badge tone="red">Expired</Badge>}
                    {expiringSoon && <Badge tone="amber">Expiring soon</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(l.monthlyRent)}</td>
                  <td className="px-4 py-3">
                    <LeaseStatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/master-admin/leases/${l.id}`} className={btn("secondary", "px-2.5 py-1.5")}>
                        Manage
                      </Link>
                      {l.status === "DRAFT" && (
                        <form action={approveLease}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className={btn("ghost", "px-2.5 py-1.5")}>Approve</button>
                        </form>
                      )}
                      {isLive && (
                        <form action={terminateLease}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className={btn("danger", "px-2.5 py-1.5")}>Terminate</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
