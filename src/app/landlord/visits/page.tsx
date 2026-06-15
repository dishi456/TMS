import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { timeAgo } from "@/lib/activity";
import { decideVisit } from "./actions";

export const metadata: Metadata = { title: "Visits" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "amber" | "green" | "red" | "slate" | "sky"> = {
  PENDING: "amber",
  CONFIRMED: "green",
  DECLINED: "red",
  CANCELLED: "slate",
  COMPLETED: "sky",
};

export default async function LandlordVisitsPage() {
  const session = await auth();
  const visits = await prisma.visit.findMany({
    where: { property: { landlordId: session!.user.id } },
    include: { property: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { preferredAt: "asc" }],
  });
  const pending = visits.filter((v) => v.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-800">
          Visit Requests <span className="text-slate-400">({formatNumber(visits.length)})</span>
        </h1>
        {pending > 0 && <Badge tone="amber">{pending} pending</Badge>}
      </div>

      {visits.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No visit requests yet. They’ll appear here when prospective tenants schedule a tour from your listings.</p></Card>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <Card key={v.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">
                    {v.fullName} <span className="text-xs font-normal text-slate-400">· {v.property.name}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {v.email}{v.phone ? ` · ${v.phone}` : ""} · requested {timeAgo(v.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    🗓️ Preferred: <strong>{v.preferredAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</strong>
                  </p>
                  {v.message && <p className="mt-1 text-sm text-slate-600">“{v.message}”</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {v.status === "PENDING" ? (
                    <>
                      <form action={decideVisit}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="action" value="confirm" />
                        <button className={btn("primary", "px-2.5 py-1.5")}>Confirm</button>
                      </form>
                      <form action={decideVisit}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="action" value="decline" />
                        <button className={btn("danger", "px-2.5 py-1.5")}>Decline</button>
                      </form>
                    </>
                  ) : v.status === "CONFIRMED" ? (
                    <>
                      <Badge tone="green">Confirmed</Badge>
                      <form action={decideVisit}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="action" value="complete" />
                        <button className={btn("secondary", "px-2.5 py-1.5")}>Mark done</button>
                      </form>
                    </>
                  ) : (
                    <Badge tone={STATUS_TONE[v.status]}>{v.status.charAt(0) + v.status.slice(1).toLowerCase()}</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
