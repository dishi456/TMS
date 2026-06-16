"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWishlist, OPEN_WISHLIST_EVENT } from "@/lib/useWishlist";
import { propertyPath } from "@/lib/property-path";
import { FavoriteButton } from "./FavoriteButton";

export type ListingItem = {
  id: string;
  ref: string | null;
  name: string;
  address: string;
  city: string;
  type: string;
  rent: number;
  rooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  furnishing: string;
  amenities: string[];
  hasLobby: boolean;
  hasParking: boolean;
  hasLift: boolean;
  powerBackup: boolean;
  available: boolean;
  availableFrom?: string | null; // set when occupied-but-on-notice
  verified: boolean;
  listedAt: string; // ISO
  photoId: string | null;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const typeLabel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
const FURNISHING: Record<string, string> = { UNFURNISHED: "Unfurnished", SEMI_FURNISHED: "Semi-furnished", FURNISHED: "Furnished" };

function amenitySet(p: ListingItem): string[] {
  const s = [...p.amenities];
  if (p.hasParking) s.push("Parking");
  if (p.hasLift) s.push("Lift / Elevator");
  if (p.hasLobby) s.push("Lobby");
  if (p.powerBackup) s.push("Power backup");
  return s;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return "Today";
  const diff = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CARD_ICON = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

type Sort = "new" | "price_asc" | "price_desc";

export function ListingsBrowser({ listings }: { listings: ListingItem[] }) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState(""); // property type
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [beds, setBeds] = useState<Set<number>>(new Set());
  const [furn, setFurn] = useState<Set<string>>(new Set());
  const [amen, setAmen] = useState<Set<string>>(new Set());
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("new");
  const [showSaved, setShowSaved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile

  const { ids: savedIds, count: savedCount } = useWishlist();
  const gridRef = useRef<HTMLDivElement>(null);

  // Header heart → jump to the saved view.
  useEffect(() => {
    const open = () => {
      setShowSaved(true);
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener(OPEN_WISHLIST_EVENT, open);
    return () => window.removeEventListener(OPEN_WISHLIST_EVENT, open);
  }, []);

  // Option lists built from the actual data.
  const cities = useMemo(() => [...new Set(listings.map((p) => p.city).filter(Boolean))].sort(), [listings]);
  const types = useMemo(() => [...new Set(listings.map((p) => p.type))], [listings]);
  const furnishings = useMemo(() => [...new Set(listings.map((p) => p.furnishing))], [listings]);
  const amenityOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((p) => amenitySet(p).forEach((a) => set.add(a)));
    return [...set].sort();
  }, [listings]);

  const toggleIn = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    setter(next);
  };

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Infinity;
    let out = listings.filter((p) => {
      if (showSaved && !savedIds.includes(p.id)) return false;
      if (city && p.city !== city) return false;
      if (category && p.type !== category) return false;
      if (kw && !(`${p.name} ${p.address}`.toLowerCase().includes(kw))) return false;
      if (p.rent < min || p.rent > max) return false;
      if (availableOnly && !p.available) return false;
      if (beds.size) {
        const r = p.rooms ?? 0;
        const hit = [...beds].some((b) => (b >= 4 ? r >= 4 : r === b));
        if (!hit) return false;
      }
      if (furn.size && !furn.has(p.furnishing)) return false;
      if (amen.size) {
        const have = amenitySet(p).map((a) => a.toLowerCase());
        if (![...amen].every((a) => have.includes(a.toLowerCase()))) return false;
      }
      return true;
    });

    out = out.sort((a, b) => {
      if (sort === "price_asc") return a.rent - b.rent;
      if (sort === "price_desc") return b.rent - a.rent;
      // newest, available first
      return Number(b.available) - Number(a.available) || +new Date(b.listedAt) - +new Date(a.listedAt);
    });
    return out;
  }, [listings, q, city, category, minPrice, maxPrice, beds, furn, amen, availableOnly, sort, showSaved, savedIds]);

  const activeFilters =
    !!q || !!city || !!category || !!minPrice || !!maxPrice || beds.size || furn.size || amen.size || availableOnly;

  const reset = () => {
    setQ(""); setCity(""); setCategory(""); setMinPrice(""); setMaxPrice("");
    setBeds(new Set()); setFurn(new Set()); setAmen(new Set()); setAvailableOnly(false);
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div>
      {/* ---------- Search bar ---------- */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 sm:w-56">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="10" r="3" /></svg>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-transparent py-2.5 text-sm text-slate-700 outline-none">
            <option value="">All locations</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or address…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
          {q && <button onClick={() => setQ("")} className="text-slate-400 hover:text-slate-600">✕</button>}
        </div>
      </div>

      {/* ---------- Category chips ---------- */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={!category} onClick={() => setCategory("")}>All</Chip>
        {types.map((t) => (
          <Chip key={t} active={category === t} onClick={() => setCategory(category === t ? "" : t)}>{typeLabel(t)}</Chip>
        ))}
      </div>

      {/* ---------- Layout: sidebar + grid ---------- */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Filters</h3>
              {activeFilters ? (
                <button onClick={reset} className="text-xs font-medium text-blue-600 hover:text-blue-700">Clear all</button>
              ) : null}
            </div>

            <FilterGroup title="Price ($/mo)">
              <div className="flex items-center gap-2">
                <input type="number" min="0" inputMode="numeric" value={minPrice} placeholder="Min" onChange={(e) => setMinPrice(e.target.value)} className={inputCls} />
                <span className="text-slate-400">–</span>
                <input type="number" min="0" inputMode="numeric" value={maxPrice} placeholder="Max" onChange={(e) => setMaxPrice(e.target.value)} className={inputCls} />
              </div>
            </FilterGroup>

            <FilterGroup title="Bedrooms">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((b) => (
                  <button key={b} onClick={() => toggleIn(beds, b, setBeds)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${beds.has(b) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-600 hover:border-blue-300"}`}>
                    {b === 4 ? "4+ BHK" : `${b} BHK`}
                  </button>
                ))}
              </div>
            </FilterGroup>

            {furnishings.length > 1 && (
              <FilterGroup title="Furnishing">
                <div className="space-y-1.5">
                  {furnishings.map((f) => (
                    <Check key={f} checked={furn.has(f)} onChange={() => toggleIn(furn, f, setFurn)} label={FURNISHING[f] ?? f} />
                  ))}
                </div>
              </FilterGroup>
            )}

            {amenityOptions.length > 0 && (
              <FilterGroup title="Amenities">
                <div className="space-y-1.5">
                  {amenityOptions.map((a) => (
                    <Check key={a} checked={amen.has(a)} onChange={() => toggleIn(amen, a, setAmen)} label={a} />
                  ))}
                </div>
              </FilterGroup>
            )}

            <FilterGroup title="Availability">
              <Check checked={availableOnly} onChange={() => setAvailableOnly((v) => !v)} label="Available now only" />
            </FilterGroup>
          </div>
        </aside>

        {/* Results column */}
        <div ref={gridRef}>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setFiltersOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 lg:hidden">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                Filters
              </button>
              <h2 className="text-base font-semibold text-slate-800">
                {showSaved ? "Saved properties" : "Properties"}
                <span className="ml-1.5 text-sm font-normal text-slate-400">({filtered.length})</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaved((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${showSaved ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-300 text-slate-700 hover:border-rose-300"}`}
              >
                <svg viewBox="0 0 24 24" className={`h-4 w-4 ${showSaved ? "fill-rose-500 stroke-rose-500" : "fill-none stroke-current"}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
                Saved {savedCount > 0 && `(${savedCount})`}
              </button>
              <label className="flex items-center gap-1.5 text-sm text-slate-500">
                <span className="hidden sm:inline">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500">
                  <option value="new">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </label>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <p className="text-4xl">{showSaved ? "🤍" : "🔍"}</p>
              <p className="mt-3 text-sm font-medium text-slate-600">
                {showSaved ? "No saved properties yet." : "No properties match your filters."}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {showSaved ? "Tap the heart on any listing to save it here." : "Try widening your price range or clearing filters."}
              </p>
              {!showSaved && activeFilters && (
                <button onClick={reset} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Clear filters</button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <Card key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ p }: { p: ListingItem }) {
  const spec = [
    p.rooms != null && p.rooms > 0 ? `${p.rooms} BHK` : null,
    p.bathrooms != null ? `${p.bathrooms} Bath` : null,
    p.areaSqft != null ? `${p.areaSqft.toLocaleString()} sqft` : null,
  ].filter(Boolean).join("  ·  ");

  return (
    <Link
      href={propertyPath(p)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/10"
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-sky-50">
        {p.photoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${p.photoId}`} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-sky-400 text-5xl text-white/90">🏢</div>
        )}

        {/* top-left badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {p.verified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M12 1l2.6 1.9 3.2-.2 1 3 2.7 1.8-1 3 1 3-2.7 1.8-1 3-3.2-.2L12 23l-2.6-1.9-3.2.2-1-3L2.5 16.5l1-3-1-3 2.7-1.8 1-3 3.2.2L12 1z" /><path d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" fill="#fff" /></svg>
              Verified
            </span>
          )}
          {!p.available && (
            <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              🔔 On notice{p.availableFrom ? ` · ${p.availableFrom}` : ""}
            </span>
          )}
        </div>

        {/* favourite heart */}
        <FavoriteButton id={p.id} className="absolute right-2.5 top-2.5" />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold text-blue-700">{money(p.rent)}<span className="text-xs font-normal text-slate-400">/mo</span></p>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{typeLabel(p.type)}</span>
        </div>
        {spec && <p className="mt-1 text-sm font-medium text-slate-600">{spec}</p>}
        <h3 className="mt-1 truncate font-semibold text-slate-800">{p.name}</h3>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
          <span className="flex min-w-0 items-center gap-1 truncate">{CARD_ICON}<span className="truncate">{p.address}</span></span>
          <span className="shrink-0 uppercase tracking-wide">{dateLabel(p.listedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${active ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}
    >
      {children}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
      {label}
    </label>
  );
}
