import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatNumber } from "@/lib/format";
import { UserStatusBadge } from "./UserStatusBadge";
import { setUserStatus, deleteUser } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"];

type Search = {
  role?: string;
  status?: string;
  q?: string;
  created?: string;
  deleted?: string;
  error?: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const role = sp.role === "TENANT" ? "TENANT" : "LANDLORD";
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : "";
  const q = (sp.q ?? "").trim();
  const isTenant = role === "TENANT";

  const users = await prisma.user.findMany({
    where: {
      role,
      ...(status ? { status: status as Prisma.UserWhereInput["status"] } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  // Average rating received, per listed user.
  const ratings = await prisma.rating.groupBy({
    by: ["rateeId"],
    where: { rateeId: { in: users.map((u) => u.id) }, status: "VISIBLE" },
    _avg: { stars: true },
    _count: true,
  });
  const ratingMap = new Map(ratings.map((r) => [r.rateeId, r]));

  return (
    <div className="space-y-4">
      {/* Banners */}
      {sp.created && <Banner tone="green">User created successfully.</Banner>}
      {sp.deleted && <Banner tone="green">User deleted.</Banner>}
      {sp.error === "has-data" && (
        <Banner tone="amber">
          This user still has properties, leases or payments and cannot be deleted. Suspend them
          instead.
        </Banner>
      )}

      {/* Tabs + New */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <Tab href="/master-admin/users?role=LANDLORD" active={!isTenant}>
            Landlords
          </Tab>
          <Tab href="/master-admin/users?role=TENANT" active={isTenant}>
            Tenants
          </Tab>
        </div>

        <Link href={`/master-admin/users/new?role=${role}`} className={btn("primary")}>
          + New {isTenant ? "Tenant" : "Landlord"}
        </Link>
      </div>

      {/* Search + status filter */}
      <form className="flex flex-wrap gap-2">
        <input type="hidden" name="role" value={role} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button className={btn("secondary")}>Filter</button>
        {(q || status) && (
          <Link href={`/master-admin/users?role=${role}`} className={btn("ghost")}>
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No {isTenant ? "tenants" : "landlords"} found.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const r = ratingMap.get(u.id);
              return (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/master-admin/users/${u.id}`}
                      className="font-medium text-slate-800 hover:text-blue-700"
                    >
                      {u.fullName}
                    </Link>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <UserStatusBadge status={u.status} />
                      {u.verified ? (
                        <Badge tone="sky">Verified</Badge>
                      ) : (
                        <Badge tone="amber">Unverified</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r?._avg.stars ? (
                      <span>
                        {r._avg.stars.toFixed(1)} <span className="text-amber-500">★</span>{" "}
                        <span className="text-xs text-slate-400">({formatNumber(r._count)})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.createdAt.toLocaleDateString("en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/master-admin/users/${u.id}`} className={btn("secondary", "px-2.5 py-1.5")}>
                        Manage
                      </Link>
                      <form action={setUserStatus}>
                        <input type="hidden" name="id" value={u.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                        />
                        <button className={btn(u.status === "PENDING" ? "primary" : "ghost", "px-2.5 py-1.5")}>
                          {u.status === "ACTIVE" ? "Suspend" : u.status === "PENDING" ? "Approve" : "Activate"}
                        </button>
                      </form>
                      <form action={deleteUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="role" value={role} />
                        <ConfirmButton
                          message={`Delete ${u.fullName}? This cannot be undone.`}
                          className={btn("danger", "px-2.5 py-1.5")}
                        >
                          Delete
                        </ConfirmButton>
                      </form>
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

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-4 py-1.5 text-sm font-medium ${
        active ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
