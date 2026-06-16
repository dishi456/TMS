import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { UserForm } from "../UserForm";
import { UserStatusBadge } from "../UserStatusBadge";
import { setUserStatus, setUserVerified, deleteUser } from "../actions";
import { adminUploadUserDoc, adminDeleteUserDoc } from "../doc-actions";
import { ZoomImage } from "@/components/ZoomImage";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === "MASTER_ADMIN") notFound();

  const isTenant = user.role === "TENANT";

  // Ratings received (SRS: View landlord/tenant ratings) + verification documents
  const [ratingAgg, recentRatings, verificationDocs] = await Promise.all([
    prisma.rating.aggregate({
      _avg: { stars: true },
      _count: true,
      where: { rateeId: id, status: "VISIBLE" },
    }),
    prisma.rating.findMany({
      where: { rateeId: id },
      include: { rater: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: { ownerId: id, propertyId: null, leaseId: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const aadhaarDocs = verificationDocs.filter((d) => d.type === "GOVERNMENT_ID");
  const photoDocs = verificationDocs.filter((d) => d.type === "PHOTO");

  // Performance / history (SRS: Monitor landlord performance / Review tenant history)
  const history = isTenant
    ? await tenantHistory(id)
    : await landlordHistory(id);

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href={`/master-admin/users?role=${user.role}`} className="text-blue-600 hover:text-blue-700">
          ← Back to {isTenant ? "tenants" : "landlords"}
        </Link>
      </div>

      {/* Header + account actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
            {user.fullName.charAt(0).toUpperCase()}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{user.fullName}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone="slate">{isTenant ? "Tenant" : "Landlord"}</Badge>
              <UserStatusBadge status={user.status} />
              {user.verified ? <Badge tone="sky">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={setUserStatus}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="status" value={user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
            <button className={btn(user.status === "PENDING" ? "primary" : "secondary")}>
              {user.status === "ACTIVE" ? "Suspend" : user.status === "PENDING" ? "Approve" : "Activate"}
            </button>
          </form>

          <form action={setUserVerified}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="verified" value={user.verified ? "false" : "true"} />
            <button className={btn(user.verified ? "secondary" : "primary")}>
              {user.verified ? "Revoke verification" : "Approve & verify"}
            </button>
          </form>

          <form action={deleteUser}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="role" value={user.role} />
            <ConfirmButton
              message={`Delete ${user.fullName}? This cannot be undone.`}
              className={btn("danger")}
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      {/* Performance / history */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {history.map((h) => (
          <StatCard key={h.label} tone="light" label={h.label} value={h.value} hint={h.hint} />
        ))}
      </div>

      {/* Verification documents (submitted by the user for approval) */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Verification documents
          {!user.verified && verificationDocs.length > 0 && (
            <span className="ml-2"><Badge tone="amber">Awaiting approval</Badge></span>
          )}
        </h3>
        {sp.uploaded && <Banner tone="green">Document uploaded.</Banner>}
        {sp.error === "nofile" && <Banner tone="amber">Please choose a file.</Banner>}
        {sp.error === "toobig" && <Banner tone="amber">File too large (max 8 MB).</Banner>}
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Aadhaar / ID</p>
              {aadhaarDocs.length === 0 ? (
                <p className="text-sm text-slate-400">Not submitted.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {aadhaarDocs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {d.contentType?.startsWith("image") && (
                          <ZoomImage src={`/api/files/${d.id}`} alt={d.label ?? "ID document"} className="h-12 w-12 shrink-0 rounded border border-slate-200 object-cover" />
                        )}
                        <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:text-blue-700">
                          {d.label ?? "Document"}
                        </a>
                      </div>
                      <form action={adminDeleteUserDoc}>
                        <input type="hidden" name="docId" value={d.id} />
                        <ConfirmButton message="Delete this document?" className="text-xs text-red-500 hover:text-red-600">remove</ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              {/* Admin upload: ID */}
              <form action={adminUploadUserDoc} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="kind" value="AADHAAR" />
                <input type="file" name="file" accept="image/*,application/pdf" required className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700" />
                <button className={btn("secondary", "px-2.5 py-1.5")}>Upload</button>
              </form>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Photos</p>
              {photoDocs.length === 0 ? (
                <p className="text-sm text-slate-400">Not submitted.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {photoDocs.map((d) => (
                    <div key={d.id} className="group relative">
                      <ZoomImage src={`/api/files/${d.id}`} alt={d.label ?? "Photo"} className="h-16 w-16 rounded-md border border-slate-200 object-cover" />
                      <form action={adminDeleteUserDoc} className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100">
                        <input type="hidden" name="docId" value={d.id} />
                        <ConfirmButton message="Delete this photo?" className="rounded-full bg-white px-1.5 text-xs text-red-600 shadow">✕</ConfirmButton>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              {/* Admin upload: photo */}
              <form action={adminUploadUserDoc} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="kind" value="PHOTO" />
                <input type="file" name="file" accept="image/*" required className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700" />
                <button className={btn("secondary", "px-2.5 py-1.5")}>Upload</button>
              </form>
            </div>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
            As admin you can upload or remove a {isTenant ? "tenant" : "landlord"}&apos;s ID and photos on their behalf
            {!user.verified ? ", then use Approve & verify above." : "."}
          </p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Account details</h3>
          <Card>
            <UserForm
              mode="edit"
              defaults={{
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone ?? undefined,
                role: isTenant ? "TENANT" : "LANDLORD",
                governmentId: user.governmentId ?? undefined,
                emergencyContact: user.emergencyContact ?? undefined,
              }}
            />
          </Card>
        </div>

        {/* Ratings */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Ratings received</h3>
          <Card>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">
                {ratingAgg._avg.stars ? ratingAgg._avg.stars.toFixed(1) : "—"}
              </span>
              <span className="text-amber-500">★</span>
              <span className="text-sm text-slate-400">
                ({formatNumber(ratingAgg._count)} reviews)
              </span>
            </div>

            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              {recentRatings.length === 0 && (
                <p className="text-sm text-slate-400">No reviews yet.</p>
              )}
              {recentRatings.map((r) => (
                <div key={r.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{r.rater.fullName}</span>
                    <span className="text-amber-500">{"★".repeat(r.stars)}</span>
                  </div>
                  {r.feedback && <p className="text-slate-500">{r.feedback}</p>}
                  {r.status !== "VISIBLE" && <Badge tone="amber">{r.status.toLowerCase()}</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls = tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}

async function landlordHistory(id: string) {
  const [properties, activeLeases, collected, openMaintenance] = await Promise.all([
    prisma.property.count({ where: { landlordId: id } }),
    prisma.lease.count({ where: { landlordId: id, status: "ACTIVE" } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", invoice: { lease: { landlordId: id } } },
    }),
    prisma.maintenanceRequest.count({
      where: { property: { landlordId: id }, status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } },
    }),
  ]);
  return [
    { label: "Properties", value: formatNumber(properties) },
    { label: "Active Leases", value: formatNumber(activeLeases) },
    { label: "Total Collected", value: formatMoney(collected._sum.amount), hint: "successful payments" },
    { label: "Open Maintenance", value: formatNumber(openMaintenance) },
  ];
}

async function tenantHistory(id: string) {
  const [leases, paid, maintenance, complaints] = await Promise.all([
    prisma.lease.count({ where: { tenantId: id } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { tenantId: id, status: "SUCCESS" },
    }),
    prisma.maintenanceRequest.count({ where: { tenantId: id } }),
    prisma.complaint.count({ where: { tenantId: id } }),
  ]);
  return [
    { label: "Leases", value: formatNumber(leases) },
    { label: "Rent Paid", value: formatMoney(paid._sum.amount), hint: `${formatNumber(paid._count)} payments` },
    { label: "Maintenance", value: formatNumber(maintenance) },
    { label: "Complaints", value: formatNumber(complaints) },
  ];
}
