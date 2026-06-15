import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LandlordReviewsPage({ searchParams }: { searchParams: Promise<{ rated?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const landlordId = session!.user.id;

  // Leases that have ended are rateable.
  const leases = await prisma.lease.findMany({
    where: { landlordId, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
    include: {
      property: { select: { name: true } },
      tenant: { select: { fullName: true } },
      ratings: { where: { direction: "LANDLORD_TO_TENANT" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-semibold text-slate-800">Rate Tenants</h1>
        <p className="text-sm text-slate-500">Rate tenants after their lease has completed, expired, or been terminated.</p>
      </div>

      {sp.rated && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">Rating saved.</div>}

      {leases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
          No ended leases yet. Tenants become rateable once their lease ends.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Lease status</th>
                <th className="px-4 py-3 font-medium">Your rating</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leases.map((l) => {
                const rated = l.ratings[0];
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.tenant.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{l.property.name}</td>
                    <td className="px-4 py-3"><Badge tone="slate">{l.status.charAt(0) + l.status.slice(1).toLowerCase()}</Badge></td>
                    <td className="px-4 py-3 text-amber-500">{rated ? "★".repeat(rated.stars) : <span className="text-slate-400">Not rated</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/landlord/reviews/${l.id}`} className={btn(rated ? "secondary" : "primary", "px-2.5 py-1.5")}>
                        {rated ? "Edit rating" : "Rate tenant"}
                      </Link>
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
