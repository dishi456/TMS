"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWishlist } from "@/lib/useWishlist";
import { propertyPath } from "@/lib/property-path";
import { FavoriteButton } from "@/app/listings/FavoriteButton";

type Item = {
  id: string; ref: string | null; name: string; address: string; type: string;
  rent: number; rooms: number | null; bathrooms: number | null; areaSqft: number | null;
  available: boolean; photoId: string | null;
};

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const typeLabel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

export function SavedList() {
  const { ids } = useWishlist();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-fetch whenever the saved set changes.
  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) { setItems([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/listings/summary?ids=${ids.join(",")}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(d.items ?? []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ids]);

  if (loading) {
    return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <p className="text-4xl">🤍</p>
        <p className="mt-3 text-sm font-medium text-slate-600">No saved properties yet.</p>
        <p className="mt-1 text-xs text-slate-400">Tap the heart on any listing to save it here.</p>
        <Link href="/listings" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Browse properties</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => {
        const spec = [
          p.rooms != null && p.rooms > 0 ? `${p.rooms} BHK` : null,
          p.bathrooms != null ? `${p.bathrooms} Bath` : null,
          p.areaSqft != null ? `${p.areaSqft.toLocaleString()} sqft` : null,
        ].filter(Boolean).join("  ·  ");
        return (
          <Link key={p.id} href={propertyPath(p)} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/10">
            <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-sky-50">
              {p.photoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${p.photoId}`} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-sky-400 text-5xl text-white/90">🏢</div>
              )}
              <FavoriteButton id={p.id} className="absolute right-2.5 top-2.5" />
              {!p.available && <span className="absolute left-2.5 top-2.5 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">Coming soon</span>}
            </div>
            <div className="flex flex-1 flex-col p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-bold text-blue-700">{money(p.rent)}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{typeLabel(p.type)}</span>
              </div>
              {spec && <p className="mt-1 text-sm font-medium text-slate-600">{spec}</p>}
              <h3 className="mt-1 truncate font-semibold text-slate-800">{p.name}</h3>
              <p className="mt-1 truncate text-xs text-slate-400">{p.address}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
