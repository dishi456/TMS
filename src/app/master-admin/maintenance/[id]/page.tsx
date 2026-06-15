import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, btn, inputClass } from "@/components/ui";
import { actionLabel, timeAgo } from "@/lib/activity";
import { MaintenanceStatusBadge, PriorityBadge } from "../MaintenanceBadges";
import { assignMaintenance, setMaintenanceStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default async function MaintenanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assigned?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const req = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: {
      property: { select: { name: true, address: true } },
      tenant: { select: { fullName: true, email: true } },
    },
  });
  if (!req) notFound();

  const activity = await prisma.auditLog.findMany({
    where: { entity: "MaintenanceRequest", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/master-admin/maintenance" className="text-blue-600 hover:text-blue-700">
          ← Back to maintenance
        </Link>
      </div>

      {sp.assigned && <Banner tone="green">Personnel assigned.</Banner>}
      {sp.error === "noassignee" && <Banner tone="amber">Enter a name to assign.</Banner>}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{req.title}</h2>
          <p className="text-sm text-slate-500">
            {req.property.name} · {req.tenant.fullName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <MaintenanceStatusBadge status={req.status} />
            <PriorityBadge priority={req.priority} />
          </div>
        </div>
        {/* Quick workflow actions */}
        <div className="flex flex-wrap items-center gap-2">
          {(req.status === "PENDING" || req.status === "ASSIGNED") && (
            <StatusButton id={req.id} status="IN_PROGRESS" label="Start work" variant="secondary" />
          )}
          {req.status === "IN_PROGRESS" && (
            <StatusButton id={req.id} status="RESOLVED" label="Mark resolved" variant="secondary" />
          )}
          {req.status === "RESOLVED" && (
            <StatusButton id={req.id} status="CLOSED" label="Close request" variant="primary" />
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Details + images */}
        <div className="space-y-5 lg:col-span-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Details</h3>
            <Card>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{req.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <Field label="Property" value={req.property.name} />
                <Field label="Address" value={req.property.address} />
                <Field label="Reported by" value={req.tenant.fullName} />
                <Field label="Reported on" value={req.createdAt.toLocaleDateString("en-US")} />
                <Field label="Assigned to" value={req.assignedTo ?? "Unassigned"} />
                <Field label="Last update" value={req.updatedAt.toLocaleDateString("en-US")} />
              </dl>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Attached photos</h3>
            <Card>
              {req.images.length === 0 ? (
                <p className="text-sm text-slate-400">No photos attached.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {req.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i + 1}`} className="h-28 w-full rounded-md border border-slate-200 object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Assign + status + activity */}
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Assign personnel</h3>
            <Card>
              <form action={assignMaintenance} className="space-y-2">
                <input type="hidden" name="id" value={req.id} />
                <input
                  name="assignedTo"
                  defaultValue={req.assignedTo ?? ""}
                  placeholder="Technician name / vendor"
                  className={inputClass + " w-full"}
                />
                <button className={btn("primary", "w-full")}>
                  {req.assignedTo ? "Reassign" : "Assign"}
                </button>
              </form>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Update status</h3>
            <Card>
              <form action={setMaintenanceStatus} className="space-y-2">
                <input type="hidden" name="id" value={req.id} />
                <select name="status" defaultValue={req.status} className={inputClass + " w-full"}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}</option>
                  ))}
                </select>
                <button className={btn("secondary", "w-full")}>Update status</button>
              </form>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent activity</h3>
            <Card>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet.</p>
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

function StatusButton({
  id,
  status,
  label,
  variant,
}: {
  id: string;
  status: string;
  label: string;
  variant: "primary" | "secondary";
}) {
  return (
    <form action={setMaintenanceStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={btn(variant)}>{label}</button>
    </form>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
