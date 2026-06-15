import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { MaintenanceStatusBadge, PriorityBadge } from "@/app/master-admin/maintenance/MaintenanceBadges";
import { MaintenanceForm } from "./MaintenanceForm";

export const metadata: Metadata = { title: "Maintenance" };
export const dynamic = "force-dynamic";

export default async function TenantMaintenancePage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const tenantId = session!.user.id;

  const [leases, requests] = await Promise.all([
    prisma.lease.findMany({
      where: { tenantId, status: { in: ["ACTIVE", "RENEWED"] } },
      select: { property: { select: { id: true, name: true } } },
    }),
    prisma.maintenanceRequest.findMany({
      where: { tenantId },
      include: { property: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Distinct leased properties for the submit form.
  const propMap = new Map<string, string>();
  for (const l of leases) propMap.set(l.property.id, l.property.name);
  const properties = [...propMap].map(([id, name]) => ({ id, name }));

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Maintenance Requests</h1>
      {sp.created && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">Request submitted.</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">New request</h2>
          <Card>
            {properties.length === 0 ? (
              <p className="text-sm text-slate-400">You need an active lease to submit a request.</p>
            ) : (
              <MaintenanceForm properties={properties} />
            )}
          </Card>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">My requests</h2>
          {requests.length === 0 ? (
            <Card><p className="text-sm text-slate-400">No requests yet.</p></Card>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-400">{r.property.name} · {r.createdAt.toLocaleDateString("en-US")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <MaintenanceStatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                  </div>
                  {r.assignedTo && <p className="mt-2 text-xs text-slate-500">Assigned to: {r.assignedTo}</p>}
                  {r.images.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {r.images.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-12 w-12 rounded-md border border-slate-200 object-cover" /></a>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
