import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toStrArr } from "@/lib/json";
import { Badge, Card } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatCard } from "@/components/StatCard";
import { formatMoney, formatNumber } from "@/lib/format";
import { LandlordPropertyForm } from "../LandlordPropertyForm";
import { deletePropertyPhoto } from "../actions";
import { ImageUploader } from "@/components/ImageUploader";
import { PropertyFeatures } from "@/components/PropertyFeatures";

export const dynamic = "force-dynamic";

export default async function LandlordPropertyDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();

  const property = await prisma.property.findFirst({
    where: { id, landlordId: session!.user.id },
    include: { documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "desc" } } },
  });
  if (!property) notFound();

  const [activeLeases, maintenance] = await Promise.all([
    prisma.lease.findMany({
      where: { propertyId: id, status: { in: ["ACTIVE", "RENEWED"] } },
      include: { tenant: { select: { fullName: true, email: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { propertyId: id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const occupancyRate = Math.min(100, Math.round((activeLeases.length / Math.max(1, property.numberOfUnits)) * 100));

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/landlord/properties" className="text-blue-600 hover:text-blue-700">← Back to properties</Link>
      </div>
      {sp.uploaded && <Banner tone="green">Photo saved.</Banner>}
      {sp.error === "nofile" && <Banner tone="amber">Please choose a file.</Banner>}
      {sp.error === "toobig" && <Banner tone="amber">File too large (max 8 MB).</Banner>}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-800">{property.name}</h1>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">ID: {property.ref ?? "—"}</span>
        </div>
        <p className="text-sm text-slate-500">{property.address}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone="slate">{property.type.charAt(0) + property.type.slice(1).toLowerCase()}</Badge>
          <Badge tone={property.availability === "OCCUPIED" ? "sky" : property.availability === "UNAVAILABLE" ? "slate" : "green"}>
            {property.availability.charAt(0) + property.availability.slice(1).toLowerCase()}
          </Badge>
          {property.approved ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Pending approval</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Units" value={formatNumber(property.numberOfUnits)} />
        <StatCard tone="light" label="Occupancy" value={`${occupancyRate}%`} hint={`${activeLeases.length}/${property.numberOfUnits}`} />
        <StatCard tone="light" label="Active Leases" value={formatNumber(activeLeases.length)} />
        <StatCard tone="light" label="Monthly Rent" value={formatMoney(property.rentAmount)} />
        <StatCard tone="light" label="Notice Period" value={`${property.noticePeriodDays} days`} hint="default for new leases" />
      </div>

      {/* Features & layout (read-only summary) */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Features &amp; layout</h3>
        <Card><PropertyFeatures p={property} /></Card>
      </div>

      {/* Photos */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Photos <span className="font-normal text-slate-400">({property.documents.length}/10)</span></h3>
        <Card>
          {property.documents.length === 0 ? (
            <p className="text-sm text-slate-400">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {property.documents.map((d) => (
                <div key={d.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/${d.id}`} alt="" className="h-28 w-full object-cover" />
                  <form action={deletePropertyPhoto} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100">
                    <input type="hidden" name="docId" value={d.id} />
                    <ConfirmButton message="Delete this photo?" className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-600 shadow">✕</ConfirmButton>
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
        <div className="lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Property details</h3>
          <Card>
            <LandlordPropertyForm
              mode="edit"
              defaults={{
                id: property.id,
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
              }}
            />
          </Card>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Assigned tenants</h3>
            <Card>
              {activeLeases.length === 0 ? (
                <p className="text-sm text-slate-400">No active tenants.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activeLeases.map((l) => (
                    <li key={l.id}>
                      <p className="font-medium text-slate-700">{l.tenant.fullName}</p>
                      <p className="text-xs text-slate-400">until {l.endDate.toLocaleDateString("en-US")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Maintenance history</h3>
            <Card>
              {maintenance.length === 0 ? (
                <p className="text-sm text-slate-400">No maintenance requests.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {maintenance.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-slate-700">{m.title}</span>
                      <Badge tone={m.status === "RESOLVED" || m.status === "CLOSED" ? "green" : "amber"}>
                        {m.status.charAt(0) + m.status.slice(1).toLowerCase().replace(/_/g, " ")}
                      </Badge>
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
  const cls = tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
