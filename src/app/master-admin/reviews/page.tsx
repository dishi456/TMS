import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatNumber } from "@/lib/format";
import { RatingStatusBadge, Stars, directionLabel } from "./ReviewsUi";
import { setRatingStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = ["VISIBLE", "FLAGGED", "REMOVED"];
const DIRECTIONS = ["LANDLORD_TO_TENANT", "TENANT_TO_LANDLORD"];

type Search = { status?: string; direction?: string };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : "";
  const direction = DIRECTIONS.includes(sp.direction ?? "") ? sp.direction : "";

  const where: Prisma.RatingWhereInput = {
    ...(status ? { status: status as Prisma.RatingWhereInput["status"] } : {}),
    ...(direction ? { direction: direction as Prisma.RatingWhereInput["direction"] } : {}),
  };

  const ratings = await prisma.rating.findMany({
    where,
    include: {
      rater: { select: { fullName: true, role: true, reviewsSuspended: true } },
      ratee: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">
        Ratings &amp; Reviews <span className="text-slate-400">({formatNumber(ratings.length)})</span>
      </h2>

      <form className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <select name="direction" defaultValue={direction} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any direction</option>
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>{directionLabel(d)}</option>
          ))}
        </select>
        <button className={btn("secondary")}>Filter</button>
        {(status || direction) && <Link href="/master-admin/reviews" className={btn("ghost")}>Clear</Link>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Review</th>
              <th className="px-4 py-3 font-medium">From → To</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ratings.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No reviews found.</td></tr>
            )}
            {ratings.map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50/60">
                <td className="max-w-xs px-4 py-3">
                  <Link href={`/master-admin/reviews/${r.id}`} className="line-clamp-2 text-slate-700 hover:text-blue-700">
                    {r.feedback || <span className="italic text-slate-400">No written feedback</span>}
                  </Link>
                  <div className="mt-0.5 text-xs text-slate-400">{r.createdAt.toLocaleDateString("en-US")}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{r.rater.fullName} → {r.ratee.fullName}</div>
                  <div className="text-xs text-slate-400">{directionLabel(r.direction)}</div>
                  {r.rater.reviewsSuspended && <Badge tone="red">Reviewer suspended</Badge>}
                </td>
                <td className="px-4 py-3"><Stars value={r.stars} /></td>
                <td className="px-4 py-3"><RatingStatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {r.status !== "FLAGGED" && r.status !== "REMOVED" && (
                      <StatusForm id={r.id} status="FLAGGED" label="Flag" variant="ghost" />
                    )}
                    {r.status !== "VISIBLE" && (
                      <StatusForm id={r.id} status="VISIBLE" label="Restore" variant="ghost" />
                    )}
                    {r.status !== "REMOVED" && (
                      <form action={setRatingStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="REMOVED" />
                        <ConfirmButton message="Remove this review from public view?" className={btn("danger", "px-2.5 py-1.5")}>
                          Remove
                        </ConfirmButton>
                      </form>
                    )}
                    <Link href={`/master-admin/reviews/${r.id}`} className={btn("secondary", "px-2.5 py-1.5")}>
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusForm({ id, status, label, variant }: { id: string; status: string; label: string; variant: "ghost" }) {
  return (
    <form action={setRatingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={btn(variant, "px-2.5 py-1.5")}>{label}</button>
    </form>
  );
}
