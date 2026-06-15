import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { timeAgo } from "@/lib/activity";
import { decideApplication } from "./actions";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function LandlordApplicationsPage() {
  const session = await auth();
  const apps = await prisma.application.findMany({
    where: { property: { landlordId: session!.user.id } },
    include: { property: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const pending = apps.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-800">
          Applications <span className="text-slate-400">({formatNumber(apps.length)})</span>
        </h1>
        {pending > 0 && <Badge tone="amber">{pending} pending</Badge>}
      </div>

      {apps.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No applications yet. Share your listings to receive applications.</p></Card>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{a.fullName} <span className="text-xs font-normal text-slate-400">· {a.property.name}</span></p>
                  <p className="text-xs text-slate-400">{a.email}{a.phone ? ` · ${a.phone}` : ""} · {timeAgo(a.createdAt)}</p>
                  {a.message && <p className="mt-2 text-sm text-slate-600">“{a.message}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  {a.status === "PENDING" ? (
                    <>
                      <form action={decideApplication}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="decision" value="APPROVED" />
                        <button className={btn("primary", "px-2.5 py-1.5")}>Approve</button>
                      </form>
                      <form action={decideApplication}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="decision" value="REJECTED" />
                        <button className={btn("danger", "px-2.5 py-1.5")}>Reject</button>
                      </form>
                    </>
                  ) : (
                    <Badge tone={a.status === "APPROVED" ? "green" : "red"}>{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</Badge>
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
