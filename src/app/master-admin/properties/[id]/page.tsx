import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toStrArr } from "@/lib/json";
import { Badge, Card, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { actionLabel, timeAgo } from "@/lib/activity";
import { PropertyForm } from "../PropertyForm";
import {
  setApproved,
  setVerified,
  deleteProperty,
  deleteDocument,
} from "../actions";
import { ImageUploader } from "@/components/ImageUploader";
import { PropertyFeatures } from "@/components/PropertyFeatures";
import { ZoomImage } from "@/components/ZoomImage";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      landlord: { select: { id: true, fullName: true } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!property) notFound();

  const [landlords, activeLeases, activity] = await Promise.all([
    prisma.user.findMany({
      where: { role: "LANDLORD" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.lease.findMany({
      where: { propertyId: id, status: { in: ["ACTIVE", "RENEWED"] } },
      include: { tenant: { select: { fullName: true, email: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entity: "Property", entityId: id },
      include: { actor: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const photos = property.documents.filter((d) => d.type === "PHOTO");
  const proofs = property.documents.filter((d) => d.type === "PROPERTY_PROOF");
  const occupancyRate = Math.min(
    100,
    Math.round((activeLeases.length / Math.max(1, property.numberOfUnits)) * 100),
  );

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/master-admin/properties" className="text-blue-600 hover:text-blue-700">
          ← Back to properties
        </Link>
      </div>

      {sp.uploaded && <Banner tone="green">File saved.</Banner>}
      {sp.error === "nofile" && <Banner tone="amber">Please choose a file to upload.</Banner>}
      {sp.error === "toobig" && <Banner tone="amber">File is too large (max 8 MB).</Banner>}

      {/* Header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">{property.name}</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">ID: {property.ref ?? "—"}</span>
          </div>
          <p className="text-sm text-slate-500">{property.address}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="slate">{property.type.charAt(0) + property.type.slice(1).toLowerCase()}</Badge>
            <Badge tone={property.availability === "OCCUPIED" ? "sky" : property.availability === "UNAVAILABLE" ? "slate" : "green"}>
              {property.availability.charAt(0) + property.availability.slice(1).toLowerCase()}
            </Badge>
            {property.approved ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Pending approval</Badge>}
            {property.verified ? <Badge tone="sky">Docs verified</Badge> : <Badge tone="slate">Docs unverified</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={setApproved}>
            <input type="hidden" name="id" value={property.id} />
            <input type="hidden" name="approved" value={property.approved ? "false" : "true"} />
            <button className={btn("secondary")}>{property.approved ? "Unapprove" : "Approve"}</button>
          </form>
          <form action={setVerified}>
            <input type="hidden" name="id" value={property.id} />
            <input type="hidden" name="verified" value={property.verified ? "false" : "true"} />
            <button className={btn("secondary")}>{property.verified ? "Unverify docs" : "Verify docs"}</button>
          </form>
          <form action={deleteProperty}>
            <input type="hidden" name="id" value={property.id} />
            <ConfirmButton message={`Remove ${property.name}? This cannot be undone.`} className={btn("danger")}>
              Remove
            </ConfirmButton>
          </form>
        </div>
      </div>

      {/* Occupancy monitor */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Units" value={formatNumber(property.numberOfUnits)} hint={property.rooms != null ? `${property.rooms} rooms` : undefined} />
        <StatCard tone="light" label="Occupancy" value={`${occupancyRate}%`} hint={`${activeLeases.length}/${property.numberOfUnits} leased`} />
        <StatCard tone="light" label="Active Leases" value={formatNumber(activeLeases.length)} />
        <StatCard tone="light" label="Monthly Rent" value={formatMoney(property.rentAmount)} />
        <StatCard tone="light" label="Notice Period" value={`${property.noticePeriodDays} days`} hint="set by landlord" />
      </div>

      {/* Features & layout (read-only summary) */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Features &amp; layout</h3>
        <Card><PropertyFeatures p={property} /></Card>
      </div>

      {/* Photos */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Photos <span className="font-normal text-slate-400">({photos.length}/10)</span></h3>
        <Card>
          {photos.length === 0 ? (
            <p className="text-sm text-slate-400">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                  <ZoomImage src={`/api/files/${p.id}`} alt={p.label ?? "Property photo"} className="h-32 w-full object-cover" />
                  <form action={deleteDocument} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100">
                    <input type="hidden" name="docId" value={p.id} />
                    <ConfirmButton message="Delete this photo?" className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-600 shadow">
                      ✕
                    </ConfirmButton>
                  </form>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <ImageUploader purpose="property-photo" refId={property.id} accept="image/*" />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Property details</h3>
          <Card>
            <PropertyForm
              mode="edit"
              landlords={landlords}
              defaults={{
                id: property.id,
                landlordId: property.landlord.id,
                name: property.name,
                type: property.type,
                address: property.address,
                description: property.description ?? undefined,
                rentAmount: property.rentAmount.toString(),
                securityDeposit: property.securityDeposit.toString(),
                numberOfUnits: String(property.numberOfUnits),
                noticePeriodDays: String(property.noticePeriodDays),
                rooms: property.rooms != null ? String(property.rooms) : undefined,
                bathrooms: property.bathrooms != null ? String(property.bathrooms) : undefined,
                balconies: property.balconies != null ? String(property.balconies) : undefined,
                floor: property.floor != null ? String(property.floor) : undefined,
                totalFloors: property.totalFloors != null ? String(property.totalFloors) : undefined,
                areaSqft: property.areaSqft != null ? String(property.areaSqft) : undefined,
                furnishing: property.furnishing,
                hasLobby: property.hasLobby,
                hasParking: property.hasParking,
                hasLift: property.hasLift,
                powerBackup: property.powerBackup,
                carpetAreaSqft: property.carpetAreaSqft != null ? String(property.carpetAreaSqft) : undefined,
                parkingSpots: property.parkingSpots != null ? String(property.parkingSpots) : undefined,
                maintenanceMonthly: property.maintenanceMonthly != null ? String(property.maintenanceMonthly) : undefined,
                facing: property.facing ?? undefined,
                listedBy: property.listedBy,
                projectName: property.projectName ?? undefined,
                bachelorsAllowed: property.bachelorsAllowed,
                listedPublic: property.listedPublic,
                amenities: toStrArr(property.amenities).join(", "),
                availability: property.availability,
                details: (property.details as Record<string, unknown>) ?? undefined,
              }}
            />
          </Card>
        </div>

        {/* Side: occupancy + ownership docs + activity */}
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Current occupancy</h3>
            <Card>
              {activeLeases.length === 0 ? (
                <p className="text-sm text-slate-400">No active leases — this property is unoccupied.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activeLeases.map((l) => (
                    <li key={l.id} className="flex items-center justify-between">
                      <span>
                        <span className="font-medium text-slate-700">{l.tenant.fullName}</span>
                        <span className="block text-xs text-slate-400">{l.tenant.email}</span>
                      </span>
                      <span className="text-xs text-slate-500">until {l.endDate.toLocaleDateString("en-US")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Ownership documents</h3>
            <Card>
              {proofs.length === 0 ? (
                <p className="text-sm text-slate-400">No ownership documents uploaded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {proofs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {d.contentType?.startsWith("image") && (
                          <ZoomImage src={`/api/files/${d.id}`} alt={d.label ?? "Document"} className="h-12 w-12 shrink-0 rounded border border-slate-200 object-cover" />
                        )}
                        <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:text-blue-700">
                          {d.label ?? "Document"}
                        </a>
                      </div>
                      <form action={deleteDocument}>
                        <input type="hidden" name="docId" value={d.id} />
                        <ConfirmButton message="Delete this document?" className="text-xs text-red-500 hover:text-red-600">
                          remove
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <ImageUploader purpose="property-proof" refId={property.id} accept="image/*,application/pdf" />
              </div>
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

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
