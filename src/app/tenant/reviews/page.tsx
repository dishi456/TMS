import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";

export const metadata: Metadata = { title: "Rate Landlord" };
export const dynamic = "force-dynamic";

export default async function TenantReviewsPage({ searchParams }: { searchParams: Promise<{ rated?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const tenantId = session!.user.id;

  const leases = await prisma.lease.findMany({
    where: { tenantId, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
    include: { property: { select: { name: true } }, landlord: { select: { fullName: true } }, ratings: { where: { direction: "TENANT_TO_LANDLORD" } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Rate Your Landlord</h1>
        <p className="text-sm text-slate-500">You can rate a landlord once your lease has ended.</p>
      </div>
      {sp.rated && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">Thanks — your rating was saved.</div>}

      {leases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
          No ended leases yet. You can rate your landlord once a lease completes or ends.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3 font-medium">Landlord</th><th className="px-4 py-3 font-medium">Property</th><th className="px-4 py-3 font-medium">Your rating</th><th className="px-4 py-3 text-right font-medium">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leases.map((l) => {
                const rated = l.ratings[0];
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.landlord.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{l.property.name}</td>
                    <td className="px-4 py-3 text-amber-500">{rated ? "★".repeat(rated.stars) : <span className="text-slate-400">Not rated</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/tenant/reviews/${l.id}`} className={btn(rated ? "secondary" : "primary", "px-2.5 py-1.5")}>{rated ? "Edit rating" : "Rate landlord"}</Link>
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
