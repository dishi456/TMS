import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toStrArr } from "@/lib/json";
import { Card, btn, inputClass } from "@/components/ui";
import { MaintenanceStatusBadge, PriorityBadge } from "@/app/master-admin/maintenance/MaintenanceBadges";
import { approveMaintenance, rejectMaintenance, assignMaintenance, setMaintenanceStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];

export default async function LandlordMaintenanceDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assigned?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();

  const req = await prisma.maintenanceRequest.findFirst({
    where: { id, property: { landlordId: session!.user.id } },
    include: { property: { select: { name: true, address: true } }, tenant: { select: { fullName: true, email: true } } },
  });
  if (!req) notFound();

  return (
    <div className="space-y-5">
      <div className="text-sm"><Link href="/landlord/maintenance" className="text-blue-600 hover:text-blue-700">← Back to maintenance</Link></div>
      {sp.assigned && <Banner tone="green">Technician assigned.</Banner>}
      {sp.error === "noassignee" && <Banner tone="amber">Enter a name to assign.</Banner>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{req.title}</h1>
          <p className="text-sm text-slate-500">{req.property.name} · {req.tenant.fullName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <MaintenanceStatusBadge status={req.status} />
            <PriorityBadge priority={req.priority} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {req.status === "PENDING" && (
            <>
              <form action={approveMaintenance}><input type="hidden" name="id" value={req.id} /><button className={btn("primary")}>Approve</button></form>
              <form action={rejectMaintenance}><input type="hidden" name="id" value={req.id} /><button className={btn("danger")}>Reject</button></form>
            </>
          )}
          {req.status === "ASSIGNED" && (
            <form action={setMaintenanceStatus}><input type="hidden" name="id" value={req.id} /><input type="hidden" name="status" value="IN_PROGRESS" /><button className={btn("secondary")}>Start work</button></form>
          )}
          {req.status === "IN_PROGRESS" && (
            <form action={setMaintenanceStatus}><input type="hidden" name="id" value={req.id} /><input type="hidden" name="status" value="RESOLVED" /><button className={btn("secondary")}>Mark resolved</button></form>
          )}
          {req.status === "RESOLVED" && (
            <form action={setMaintenanceStatus}><input type="hidden" name="id" value={req.id} /><input type="hidden" name="status" value="CLOSED" /><button className={btn("primary")}>Close</button></form>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
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
                <Field label="Priority" value={req.priority.charAt(0) + req.priority.slice(1).toLowerCase()} />
              </dl>
            </Card>
          </div>
          {toStrArr(req.images).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Attached photos</h3>
              <Card>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {toStrArr(req.images).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Photo ${i + 1}`} className="h-28 w-full rounded-md border border-slate-200 object-cover" /></a>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Assign technician</h3>
            <Card>
              <form action={assignMaintenance} className="space-y-2">
                <input type="hidden" name="id" value={req.id} />
                <input name="assignedTo" defaultValue={req.assignedTo ?? ""} placeholder="Technician / vendor" className={inputClass + " w-full"} />
                <button className={btn("primary", "w-full")}>{req.assignedTo ? "Reassign" : "Assign"}</button>
              </form>
            </Card>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Update status</h3>
            <Card>
              <form action={setMaintenanceStatus} className="space-y-2">
                <input type="hidden" name="id" value={req.id} />
                <select name="status" defaultValue={req.status} className={inputClass + " w-full"}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ")}</option>)}
                </select>
                <button className={btn("secondary", "w-full")}>Update status</button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-400">{label}</dt><dd className="text-slate-800">{value}</dd></div>;
}
function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls = tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
