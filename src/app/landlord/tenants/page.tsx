import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { approveTenant, setTenantStatus } from "./actions";
import { ConvertUserForm } from "./ConvertUserForm";

export const dynamic = "force-dynamic";

export default async function LandlordTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; added?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const landlordId = session!.user.id;

  const tenants = await prisma.user.findMany({
    where: { role: "TENANT", landlordId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const pending = tenants.filter((t) => t.status === "PENDING");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-800">
          My Tenants <span className="text-slate-400">({formatNumber(tenants.length)})</span>
        </h1>
        <Link href="/landlord/tenants/new" className={btn("primary")}>+ Add Tenant</Link>
      </div>

      {sp.approved && <Banner>Tenant approved.</Banner>}
      {sp.added && <Banner>Tenant added.</Banner>}

      <ConvertUserForm />

      {pending.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {pending.length} tenant{pending.length > 1 ? "s" : ""} awaiting your approval.
        </p>
      )}

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
          No tenants yet. Use “Add Tenant”, or share the sign-up link so they can register under you.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/landlord/tenants/${t.id}`} className="font-medium text-slate-800 hover:text-blue-700">
                      {t.fullName}
                    </Link>
                    <div className="text-xs text-slate-400">{t.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.phone ?? "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/landlord/tenants/${t.id}`} className={btn("secondary", "px-2.5 py-1.5")}>Monitor</Link>
                      {t.status === "PENDING" ? (
                        <form action={approveTenant}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className={btn("primary", "px-2.5 py-1.5")}>Approve</button>
                        </form>
                      ) : (
                        <form action={setTenantStatus}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="status" value={t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                          <button className={btn("ghost", "px-2.5 py-1.5")}>{t.status === "ACTIVE" ? "Suspend" : "Activate"}</button>
                        </form>
                      )}
                    </div>
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

function StatusPill({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge tone="green">Active</Badge>;
  if (status === "PENDING") return <Badge tone="amber">Pending</Badge>;
  return <Badge tone="red">Suspended</Badge>;
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">{children}</div>;
}
