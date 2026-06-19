import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleHome, type Role } from "@/lib/roles";
import { SiteFooter } from "@/components/SiteFooter";
import { Nav } from "@/app/_landing/Nav";
import { ListingsBrowser, type ListingItem } from "./ListingsBrowser";

export const metadata: Metadata = {
  title: "Available Properties",
  description: "Browse rental properties on Lease Lord.",
};
export const dynamic = "force-dynamic";

// "123 Main St, Brooklyn, NY" → "Brooklyn, NY" (last two segments) for the
// location filter; falls back to the whole address.
function cityOf(address: string): string {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return parts[0] ?? address;
}

const TYPES = ["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL", "OTHER"];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; city?: string; available?: string }>;
}) {
  const sp = await searchParams;
  const initial = {
    type: TYPES.includes((sp.type ?? "").toUpperCase()) ? (sp.type ?? "").toUpperCase() : undefined,
    city: sp.city || undefined,
    available: sp.available === "1",
  };
  const session = await auth();
  const home = session?.user ? (roleHome[session.user.role as Role] ?? "/account") : null;
  // Show properties that are available now, OR occupied-but-on-notice (a tenant
  // has given notice to vacate, so they'll free up soon).
  const properties = await prisma.property.findMany({
    where: {
      approved: true,
      listedPublic: true,
      OR: [
        { availability: "AVAILABLE" },
        { leases: { some: { status: { in: ["ACTIVE", "RENEWED"] }, noticeGivenAt: { not: null } } } },
      ],
    },
    include: {
      documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" } },
      landlord: { select: { verified: true } },
      leases: {
        where: { status: { in: ["ACTIVE", "RENEWED"] }, noticeGivenAt: { not: null } },
        select: { noticeEffectiveDate: true, endDate: true },
        orderBy: { noticeEffectiveDate: "asc" },
        take: 1,
      },
    },
    orderBy: [{ availability: "asc" }, { createdAt: "desc" }],
  });

  const availableCount = properties.filter((p) => p.availability === "AVAILABLE").length;

  const listings: ListingItem[] = properties.map((p) => {
    const available = p.availability === "AVAILABLE";
    const noticeLease = !available ? p.leases[0] : undefined;
    const noticeDate = noticeLease?.noticeEffectiveDate ?? noticeLease?.endDate ?? null;
    return {
      id: p.id,
      ref: p.ref,
      name: p.name,
      address: p.address,
      city: cityOf(p.address),
      type: p.type,
      rent: Number(p.rentAmount),
      rooms: p.rooms,
      bathrooms: p.bathrooms,
      areaSqft: p.areaSqft,
      furnishing: p.furnishing,
      amenities: p.amenities,
      hasLobby: p.hasLobby,
      hasParking: p.hasParking,
      hasLift: p.hasLift,
      powerBackup: p.powerBackup,
      available,
      availableFrom: noticeDate ? noticeDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
      verified: p.verified || p.landlord.verified,
      listedAt: p.createdAt.toISOString(),
      photoId: p.documents[0]?.id ?? null,
    };
  });

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
    <Nav variant="solid" account={home} />
    <main className="flex-1">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Breadcrumb + heading */}
        <p className="text-xs text-slate-400"><Link href="/" className="hover:text-slate-600">Home</Link> / Properties</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Properties for rent</h1>
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-emerald-600">{availableCount}</span> available now
            {properties.length > availableCount && <span> · {properties.length - availableCount} coming soon</span>}
          </p>
        </div>

        <div className="mt-5">
          <ListingsBrowser listings={listings} initial={initial} />
        </div>
      </div>
    </main>
    <SiteFooter />
    </div>
  );
}
