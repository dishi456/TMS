import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SmartMatch, type ListingItem } from "./SmartMatch";

export const metadata: Metadata = {
  title: "Available Properties",
  description: "Browse rental properties on the Tenant Management System.",
};
export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const properties = await prisma.property.findMany({
    where: { approved: true },
    include: {
      documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ availability: "asc" }, { createdAt: "desc" }],
  });

  const availableCount = properties.filter((p) => p.availability === "AVAILABLE").length;

  const listings: ListingItem[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
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
    available: p.availability === "AVAILABLE",
    photoId: p.documents[0]?.id ?? null,
  }));

  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/"><Logo className="h-9" /></Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/reviews" className="font-medium text-slate-600 hover:text-slate-900">Reviews</Link>
            <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Sign in</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
            🏡 Verified rentals
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">Find your next home</h1>
          <p className="mt-3 max-w-xl text-sm text-blue-50 sm:text-base">
            Browse verified listings and get instantly matched to your budget, location and must-have amenities.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-white">
            <div>
              <p className="text-2xl font-bold">{availableCount}</p>
              <p className="text-xs text-blue-100">Available now</p>
            </div>
            <div className="border-l border-white/20 pl-6">
              <p className="text-2xl font-bold">{properties.length}</p>
              <p className="text-xs text-blue-100">Total listings</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <SmartMatch listings={listings} />
      </div>
    </main>
  );
}
