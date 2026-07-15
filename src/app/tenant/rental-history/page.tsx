import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Rental History" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "green" | "sky" | "amber" | "slate" | "red"> = {
  ACTIVE: "green",
  RENEWED: "sky",
  EXPIRED: "slate",
  TERMINATED: "red",
  COMPLETED: "slate",
  DRAFT: "amber",
};

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

// Months between two dates, for a friendly "duration of stay".
function duration(start: Date, end: Date | null) {
  const to = end ?? new Date();
  const months = Math.max(1, Math.round((to.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  if (months < 12) return `${months} mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} yr`;
}

function Stars({ n }: { n: number }) {
  return <span className="text-amber-500">{"★".repeat(n)}{"☆".repeat(Math.max(0, 5 - n))}</span>;
}

export default async function RentalHistoryPage() {
  const session = await auth();
  const tenantId = session!.user.id;

  const leases = await prisma.lease.findMany({
    where: { tenantId },
    orderBy: { startDate: "desc" },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          address: true,
          documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
        },
      },
      landlord: { select: { id: true, fullName: true } },
      ratings: { select: { direction: true, stars: true, feedback: true, recommend: true, status: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Rental History</h1>
        <p className="text-sm text-slate-500">Every place you&apos;ve leased — landlords, durations, and the reviews exchanged.</p>
      </div>

      {leases.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No rental history yet.</p></Card>
      ) : (
        <ol className="relative space-y-5 border-l border-slate-200 pl-5">
          {leases.map((l) => {
            const photo = l.property.documents[0] ? `/api/files/${l.property.documents[0].id}` : null;
            const fromLandlord = l.ratings.find((r) => r.direction === "LANDLORD_TO_TENANT" && r.status === "VISIBLE");
            const fromTenant = l.ratings.find((r) => r.direction === "TENANT_TO_LANDLORD");
            return (
              <li key={l.id} className="relative">
                <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow" />
                <Card>
                  <div className="flex gap-3">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">🏠</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{l.property.name}</p>
                          <p className="truncate text-xs text-slate-500">{l.property.address}</p>
                        </div>
                        <Badge tone={STATUS_TONE[l.status] ?? "slate"}>{l.status}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-4">
                        <div><span className="text-slate-400">Landlord</span><br />{l.landlord.fullName}</div>
                        <div><span className="text-slate-400">Rent</span><br />{formatMoney(l.monthlyRent)}/mo</div>
                        <div><span className="text-slate-400">Period</span><br />{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</div>
                        <div><span className="text-slate-400">Duration</span><br />{duration(l.startDate, l.endDate)}</div>
                      </div>

                      {(fromLandlord || fromTenant) && (
                        <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                          {fromLandlord && (
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-[11px] font-medium text-slate-500">Landlord rated you <Stars n={fromLandlord.stars} /></p>
                              {fromLandlord.feedback && <p className="mt-0.5 text-xs text-slate-600">“{fromLandlord.feedback}”</p>}
                            </div>
                          )}
                          {fromTenant && (
                            <div className="rounded-lg bg-blue-50 px-3 py-2">
                              <p className="text-[11px] font-medium text-blue-600">You rated this landlord <Stars n={fromTenant.stars} /></p>
                              {fromTenant.feedback && <p className="mt-0.5 text-xs text-slate-600">“{fromTenant.feedback}”</p>}
                            </div>
                          )}
                        </div>
                      )}

                      {!fromTenant && (l.status === "EXPIRED" || l.status === "TERMINATED" || l.status === "COMPLETED") && (
                        <Link href={`/tenant/reviews/${l.id}`} className="mt-3 inline-block text-xs font-medium text-blue-600 hover:text-blue-700">Rate this landlord →</Link>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
