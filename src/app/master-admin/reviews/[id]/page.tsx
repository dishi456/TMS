import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { actionLabel, timeAgo } from "@/lib/activity";
import { RatingStatusBadge, Stars, directionLabel } from "../ReviewsUi";
import { setRatingStatus, setReviewPrivileges } from "../actions";

export const dynamic = "force-dynamic";

function criteriaEntries(criteria: unknown): [string, number][] {
  if (!criteria || typeof criteria !== "object") return [];
  return Object.entries(criteria as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => [k, v as number]);
}

function titleizeKey(k: string) {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rating = await prisma.rating.findUnique({
    where: { id },
    include: {
      rater: { select: { id: true, fullName: true, role: true, reviewsSuspended: true } },
      ratee: { select: { id: true, fullName: true } },
      lease: { include: { property: { select: { name: true } } } },
    },
  });
  if (!rating) notFound();

  const activity = await prisma.auditLog.findMany({
    where: { entity: "Rating", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const criteria = criteriaEntries(rating.criteria);

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/master-admin/reviews" className="text-blue-600 hover:text-blue-700">
          ← Back to reviews
        </Link>
      </div>

      {/* Header + status actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Stars value={rating.stars} />
            <RatingStatusBadge status={rating.status} />
            {rating.recommend && <Badge tone="green">Recommends</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {directionLabel(rating.direction)} · {rating.lease.property.name} ·{" "}
            {rating.createdAt.toLocaleDateString("en-US")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rating.status !== "FLAGGED" && rating.status !== "REMOVED" && (
            <StatusForm id={rating.id} status="FLAGGED" label="Flag" variant="secondary" />
          )}
          {rating.status !== "VISIBLE" && (
            <StatusForm id={rating.id} status="VISIBLE" label="Restore" variant="secondary" />
          )}
          {rating.status !== "REMOVED" && (
            <form action={setRatingStatus}>
              <input type="hidden" name="id" value={rating.id} />
              <input type="hidden" name="status" value="REMOVED" />
              <ConfirmButton message="Remove this review from public view?" className={btn("danger")}>
                Remove
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Feedback + criteria */}
        <div className="space-y-5 lg:col-span-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Written feedback</h3>
            <Card>
              {rating.feedback ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{rating.feedback}</p>
              ) : (
                <p className="text-sm italic text-slate-400">No written feedback provided.</p>
              )}
            </Card>
          </div>

          {criteria.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Evaluation criteria</h3>
              <Card>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {criteria.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <dt className="text-slate-500">{titleizeKey(k)}</dt>
                      <dd><Stars value={v} /></dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </div>
          )}
        </div>

        {/* Parties + reviewer privileges + activity */}
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Parties</h3>
            <Card>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-slate-400">Reviewer ({rating.rater.role === "LANDLORD" ? "Landlord" : "Tenant"})</dt>
                  <dd>
                    <Link href={`/master-admin/users/${rating.rater.id}`} className="text-blue-600 hover:text-blue-700">
                      {rating.rater.fullName}
                    </Link>
                    {rating.rater.reviewsSuspended && <span className="ml-2"><Badge tone="red">Suspended</Badge></span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Reviewed</dt>
                  <dd>
                    <Link href={`/master-admin/users/${rating.ratee.id}`} className="text-blue-600 hover:text-blue-700">
                      {rating.ratee.fullName}
                    </Link>
                  </dd>
                </div>
              </dl>

              {/* SRS: Suspend review privileges (of the reviewer) */}
              <form action={setReviewPrivileges} className="mt-3 border-t border-slate-100 pt-3">
                <input type="hidden" name="userId" value={rating.rater.id} />
                <input type="hidden" name="ratingId" value={rating.id} />
                <input type="hidden" name="suspended" value={rating.rater.reviewsSuspended ? "false" : "true"} />
                <button className={btn(rating.rater.reviewsSuspended ? "secondary" : "danger", "w-full")}>
                  {rating.rater.reviewsSuspended ? "Restore review privileges" : "Suspend review privileges"}
                </button>
              </form>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Moderation activity</h3>
            <Card>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-400">No moderation actions yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="text-slate-700">{actionLabel(a.action)}</span>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusForm({ id, status, label, variant }: { id: string; status: string; label: string; variant: "secondary" }) {
  return (
    <form action={setRatingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={btn(variant)}>{label}</button>
    </form>
  );
}
