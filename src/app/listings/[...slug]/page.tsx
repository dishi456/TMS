import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui";
import { roleHome, type Role } from "@/lib/roles";
import { propertyPath } from "@/lib/property-path";
import { formatMoney, formatNumber } from "@/lib/format";
import { PropertyGallery } from "./PropertyGallery";
import { InquiryPanel } from "./InquiryPanel";

export const metadata: Metadata = { title: "Property" };
export const dynamic = "force-dynamic";

function VerifiedBadge() {
  return (
    <span
      title="Verified owner — ownership documents checked by admin"
      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1l2.6 1.9 3.2-.2 1 3 2.7 1.8-1 3 1 3-2.7 1.8-1 3-3.2-.2L12 23l-2.6-1.9-3.2.2-1-3L2.5 16.5l1-3-1-3 2.7-1.8 1-3 3.2.2L12 1z" />
        <path d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" fill="#fff" />
      </svg>
      Verified
    </span>
  );
}

const FURNISHING: Record<string, string> = {
  UNFURNISHED: "Unfurnished",
  SEMI_FURNISHED: "Semi-furnished",
  FURNISHED: "Furnished",
};
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  // Canonical URL is /listings/{category}/{type}/{city}/{ref}; the identifier
  // is always the last path segment. We also accept a bare /listings/{ref|id}.
  const identifier = decodeURIComponent(slug[slug.length - 1] ?? "");
  const session = await auth();
  const loggedIn = !!session?.user;
  const home = session?.user ? (roleHome[session.user.role as Role] ?? "/account") : null;
  const property = await prisma.property.findFirst({
    where: { OR: [{ ref: identifier }, { id: identifier }], approved: true, listedPublic: true },
    include: {
      documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" } },
      landlord: { select: { fullName: true, verified: true } },
      leases: {
        where: { status: { in: ["ACTIVE", "RENEWED"] }, noticeGivenAt: { not: null } },
        select: { noticeEffectiveDate: true, endDate: true },
        orderBy: { noticeEffectiveDate: "asc" },
        take: 1,
      },
    },
  });
  if (!property) notFound();

  // Send any non-canonical path (bare id/ref, or wrong type/city) to the
  // canonical SEO URL.
  const canonical = propertyPath(property);
  if (`/listings/${slug.join("/")}` !== canonical) redirect(canonical);

  const available = property.availability === "AVAILABLE";
  const onNotice = !available && property.leases.length > 0;
  const noticeDate = onNotice ? (property.leases[0].noticeEffectiveDate ?? property.leases[0].endDate) : null;
  const noticeLabel = noticeDate ? noticeDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  // "2 BHK · 2 Bath · 1050 sqft" summary line
  const summary = [
    property.rooms ? `${property.rooms} BHK` : null,
    property.bathrooms != null ? `${property.bathrooms} Bath` : null,
    property.areaSqft != null ? `${formatNumber(property.areaSqft)} sqft` : null,
  ].filter(Boolean).join("  ·  ");

  // OLX-style key/value detail rows (only those with a value)
  const details: [string, string][] = [["Type", cap(property.type)]];
  if (property.rooms != null) details.push(["Bedrooms", formatNumber(property.rooms)]);
  if (property.bathrooms != null) details.push(["Bathrooms", formatNumber(property.bathrooms)]);
  details.push(["Furnishing", FURNISHING[property.furnishing] ?? property.furnishing]);
  if (property.areaSqft != null) details.push(["Super built-up area", `${formatNumber(property.areaSqft)} sq ft`]);
  if (property.carpetAreaSqft != null) details.push(["Carpet area", `${formatNumber(property.carpetAreaSqft)} sq ft`]);
  if (property.floor != null) details.push(["Floor", property.totalFloors != null ? `${property.floor} of ${property.totalFloors}` : String(property.floor)]);
  if (property.balconies != null) details.push(["Balconies", formatNumber(property.balconies)]);
  if (property.facing) details.push(["Facing", property.facing]);
  if (property.parkingSpots != null) details.push(["Car parking", formatNumber(property.parkingSpots)]);
  else details.push(["Parking", property.hasParking ? "Yes" : "No"]);
  details.push(["Lift / Elevator", property.hasLift ? "Yes" : "No"]);
  details.push(["Power backup", property.powerBackup ? "Yes" : "No"]);
  details.push(["Bachelors allowed", property.bachelorsAllowed ? "Yes" : "No"]);
  if (property.maintenanceMonthly != null) details.push(["Maintenance (monthly)", formatMoney(property.maintenanceMonthly)]);
  details.push(["Notice period", `${property.noticePeriodDays} days`]);
  details.push(["Security deposit", formatMoney(property.securityDeposit)]);
  if (property.projectName) details.push(["Project / society", property.projectName]);
  if (property.numberOfUnits > 1) details.push(["Units", formatNumber(property.numberOfUnits)]);
  details.push(["Listed by", cap(property.listedBy)]);

  const amenities = [...property.amenities];
  if (property.hasLobby) amenities.unshift("Lobby");

  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/listings"><Logo className="h-9" /></Link>
          {home ? (
            <Link href={home} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">My account</Link>
          ) : (
            <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Sign in</Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/listings" className="text-sm text-blue-600 hover:text-blue-700">← All properties</Link>

        <div className="mt-3 grid gap-6 lg:grid-cols-3">
          {/* ---------- Left: gallery + details + description ---------- */}
          <div className="space-y-6 lg:col-span-2">
            {/* Gallery (unchanged) */}
            <PropertyGallery photoIds={property.documents.map((d) => d.id)} name={property.name} />

            {/* Title + price */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold text-slate-900">{property.name}</h1>
                    {(property.verified || property.landlord.verified) && <VerifiedBadge />}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {property.address}
                  </p>
                </div>
                {available ? <Badge tone="green">Available</Badge> : onNotice ? <Badge tone="amber">🔔 On notice · available {noticeLabel}</Badge> : <Badge tone="slate">Occupied</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl font-bold text-blue-700">
                  {formatMoney(property.rentAmount)}<span className="text-base font-normal text-slate-400">/mo</span>
                </p>
                {summary && <span className="text-sm font-medium text-slate-500">{summary}</span>}
              </div>
            </div>

            {/* Details */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Details</h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 text-sm">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>

              {amenities.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-sm font-semibold text-slate-700">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a) => (
                      <span key={a} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Description */}
            {property.description && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{property.description}</p>
              </section>
            )}
          </div>

          {/* ---------- Right: inquiry panel (sticky) ---------- */}
          <div className="self-start lg:sticky lg:top-20">
            <InquiryPanel propertyId={property.id} available={available} loggedIn={loggedIn} />
          </div>
        </div>
      </div>
    </main>
  );
}
