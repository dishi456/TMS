import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleHome, type Role } from "@/lib/roles";
import { propertyPath } from "@/lib/property-path";
import { formatMoney, formatNumber } from "@/lib/format";
import { SiteFooter } from "@/components/SiteFooter";
import { Nav } from "@/app/_landing/Nav";
import { PropertyGallery } from "./PropertyGallery";
import { InquiryPanel } from "./InquiryPanel";
import { DetailTabs } from "./DetailTabs";

export const metadata: Metadata = { title: "Property" };
export const dynamic = "force-dynamic";

function VerifiedBadge() {
  return (
    <span title="Verified owner — ownership documents checked by admin" className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1l2.6 1.9 3.2-.2 1 3 2.7 1.8-1 3 1 3-2.7 1.8-1 3-3.2-.2L12 23l-2.6-1.9-3.2.2-1-3L2.5 16.5l1-3-1-3 2.7-1.8 1-3 3.2.2L12 1z" />
        <path d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" fill="#fff" />
      </svg>
      Verified
    </span>
  );
}

const FURNISHING: Record<string, string> = { UNFURNISHED: "Unfurnished", SEMI_FURNISHED: "Semi-furnished", FURNISHED: "Furnished" };
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const PinIcon = (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
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

  const canonical = propertyPath(property);
  if (`/listings/${slug.join("/")}` !== canonical) redirect(canonical);

  const available = property.availability === "AVAILABLE";
  const onNotice = !available && property.leases.length > 0;
  const noticeDate = onNotice ? (property.leases[0].noticeEffectiveDate ?? property.leases[0].endDate) : null;
  const noticeLabel = noticeDate ? noticeDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const verified = property.verified || property.landlord.verified;
  const photoIds = property.documents.map((d) => d.id);
  const city = property.address.split(",").map((s) => s.trim()).filter(Boolean).slice(-2).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;

  // Hero stat tiles (3, drop any that are empty).
  const tiles = [
    { value: `${formatMoney(property.rentAmount)}`, label: "Per month" },
    { value: formatMoney(property.securityDeposit), label: "Security deposit" },
    property.areaSqft != null
      ? { value: `${formatNumber(property.areaSqft)} ft²`, label: "Built-up area" }
      : { value: available ? "Available" : "On notice", label: "Availability" },
  ];

  // Detail key/value rows.
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
  details.push(["Listed by", cap(property.listedBy)]);
  details.push(["Reference", property.ref ?? "—"]);

  const amenities = [...property.amenities];
  if (property.hasLobby) amenities.unshift("Lobby");

  const tabs = [
    { id: "overview", label: "Overview", icon: "info" as const },
    { id: "details", label: "Details", icon: "list" as const },
    ...(amenities.length ? [{ id: "amenities", label: "Amenities", icon: "star" as const }] : []),
    ...(property.description ? [{ id: "description", label: "Description", icon: "doc" as const }] : []),
    { id: "location", label: "Location", icon: "pin" as const },
    { id: "contact", label: "Contact", icon: "chat" as const },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
    <Nav variant="solid" account={home} />
    <main className="flex-1">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 text-sm text-slate-500">
          <Link href="/listings" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            Back to search
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/listings" className="hover:text-slate-700">Properties</Link>
          <span className="text-slate-300">›</span>
          <span className="hover:text-slate-700">{city}</span>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-700">{property.name}</span>
        </div>
      </div>

      {/* ---------- Hero band ---------- */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-blue-50 via-sky-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-2">
          {/* Left: title + tiles + owner + CTAs */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{property.name}</h1>
              {verified && <VerifiedBadge />}
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">{cap(property.type)}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">{PinIcon}{property.address}</p>

            <div className="mt-3">
              {available ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">● Available now</span>
              ) : onNotice ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">🔔 On notice · free {noticeLabel}</span>
              ) : (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">Occupied</span>
              )}
            </div>

            {/* stat tiles */}
            <div className="mt-5 flex divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {tiles.map((t) => (
                <div key={t.label} className="flex-1 px-4 py-3">
                  <p className="text-lg font-bold text-slate-900">{t.value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t.label}</p>
                </div>
              ))}
            </div>

            {/* owner */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{property.landlord.fullName.charAt(0)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{property.landlord.fullName}</p>
                <p className="text-xs text-slate-400">Listed by {cap(property.listedBy)}{verified ? " · Verified owner" : ""}</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#contact" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">💬 Contact owner</a>
              <a href="#gallery" className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300">
                View {photoIds.length || ""} photo{photoIds.length === 1 ? "" : "s"}
              </a>
            </div>
          </div>

          {/* Right: gallery */}
          <div id="gallery" className="scroll-mt-20">
            <PropertyGallery photoIds={photoIds} name={property.name} />
          </div>
        </div>
      </section>

      {/* Sticky section tabs */}
      <DetailTabs tabs={tabs} />

      {/* ---------- Content ---------- */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Overview */}
            <section id="overview" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  property.rooms != null ? { icon: "🛏", v: `${property.rooms}`, l: "Bedrooms" } : null,
                  property.bathrooms != null ? { icon: "🛁", v: `${property.bathrooms}`, l: "Bathrooms" } : null,
                  property.areaSqft != null ? { icon: "📐", v: `${formatNumber(property.areaSqft)}`, l: "sq ft" } : null,
                  { icon: "🏷", v: FURNISHING[property.furnishing] ?? "—", l: "Furnishing" },
                ].filter(Boolean).map((q) => {
                  const x = q as { icon: string; v: string; l: string };
                  return (
                    <div key={x.l} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                      <p className="text-xl">{x.icon}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{x.v}</p>
                      <p className="text-xs text-slate-500">{x.l}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Details */}
            <section id="details" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Details</h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 text-sm">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section id="amenities" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{a}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Description */}
            {property.description && (
              <section id="description" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{property.description}</p>
              </section>
            )}

            {/* Location */}
            <section id="location" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Location</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">{PinIcon}{property.address}</p>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="group mt-4 block overflow-hidden rounded-xl border border-slate-200">
                <div className="relative flex h-56 items-center justify-center bg-[linear-gradient(0deg,#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] [background-size:28px_28px]">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 to-emerald-50/40" />
                  <span className="relative inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-md ring-1 ring-slate-200 transition-transform group-hover:scale-105">
                    {PinIcon} View on Google Maps
                  </span>
                </div>
              </a>
            </section>
          </div>

          {/* Sticky contact card */}
          <div id="contact" className="scroll-mt-20 self-start lg:sticky lg:top-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold text-blue-700">{formatMoney(property.rentAmount)}<span className="text-sm font-normal text-slate-400">/mo</span></p>
                <span className="font-mono text-xs text-slate-400">#{property.ref ?? "—"}</span>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <InquiryPanel propertyId={property.id} available={available} loggedIn={loggedIn} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <SiteFooter />
    </div>
  );
}
