"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ListingItem = {
  id: string;
  name: string;
  address: string;
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
  photoId: string | null;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const TYPES = ["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL", "OTHER"];
const typeLabel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

// A property's full amenity set = listed amenities + facility flags.
function amenitySet(p: ListingItem): string[] {
  const s = [...p.amenities];
  if (p.hasParking) s.push("Parking");
  if (p.hasLift) s.push("Lift / Elevator");
  if (p.hasLobby) s.push("Lobby");
  if (p.powerBackup) s.push("Power backup");
  return s;
}

type Prefs = { budget: string; location: string; type: string; bedrooms: string; amenities: string[] };

type Scored = { p: ListingItem; pct: number; reasons: string[] };

function scoreListing(p: ListingItem, prefs: Prefs, wantedAmenities: string[]): Scored {
  let weight = 0;
  let got = 0;
  const reasons: string[] = [];

  // Budget — the heaviest signal.
  const budget = Number(prefs.budget);
  if (prefs.budget && budget > 0) {
    weight += 3;
    if (p.rent <= budget) {
      got += 3;
      reasons.push("Within budget");
    } else if (p.rent <= budget * 1.1) {
      got += 2.1;
      reasons.push("Slightly over budget");
    } else if (p.rent <= budget * 1.25) {
      got += 1.2;
    }
  }

  // Location — match against the address text.
  const loc = prefs.location.trim().toLowerCase();
  if (loc) {
    weight += 2;
    if (p.address.toLowerCase().includes(loc)) {
      got += 2;
      reasons.push(`In ${prefs.location.trim()}`);
    }
  }

  // Property type.
  if (prefs.type) {
    weight += 1;
    if (p.type === prefs.type) {
      got += 1;
      reasons.push(typeLabel(p.type));
    }
  }

  // Minimum bedrooms.
  const minBeds = Number(prefs.bedrooms);
  if (prefs.bedrooms && minBeds > 0) {
    weight += 1;
    if ((p.rooms ?? 0) >= minBeds) {
      got += 1;
      reasons.push(`${p.rooms}+ beds`);
    }
  }

  // Preferred amenities — proportional.
  if (wantedAmenities.length > 0) {
    weight += 2;
    const have = amenitySet(p).map((a) => a.toLowerCase());
    const matched = wantedAmenities.filter((a) => have.includes(a.toLowerCase()));
    if (matched.length > 0) {
      got += (matched.length / wantedAmenities.length) * 2;
      reasons.push(matched.join(", "));
    }
  }

  const pct = weight === 0 ? 0 : Math.round((got / weight) * 100);
  return { p, pct, reasons };
}

export function SmartMatch({ listings }: { listings: ListingItem[] }) {
  const [prefs, setPrefs] = useState<Prefs>({ budget: "", location: "", type: "", bedrooms: "", amenities: [] });

  // Build the amenity option list from the actual data.
  const amenityOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((p) => amenitySet(p).forEach((a) => set.add(a)));
    return [...set].sort();
  }, [listings]);

  const active = !!(prefs.budget || prefs.location.trim() || prefs.type || prefs.bedrooms || prefs.amenities.length);

  const ranked = useMemo(() => {
    if (!active) return null;
    return listings
      .map((p) => scoreListing(p, prefs, prefs.amenities))
      .sort((a, b) => b.pct - a.pct || Number(b.p.available) - Number(a.p.available) || a.p.rent - b.p.rent);
  }, [listings, prefs, active]);

  const toggleAmenity = (a: string) =>
    setPrefs((s) => ({
      ...s,
      amenities: s.amenities.includes(a) ? s.amenities.filter((x) => x !== a) : [...s.amenities, a],
    }));

  const reset = () => setPrefs({ budget: "", location: "", type: "", bedrooms: "", amenities: [] });

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const shown: Scored[] = active ? ranked! : listings.map((p) => ({ p, pct: 0, reasons: [] }));

  return (
    <div>
      {/* Smart Match panel */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h2 className="text-sm font-semibold text-slate-800">Smart Match — find your perfect home</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Max budget ($/mo)</span>
            <input type="number" min="0" inputMode="numeric" value={prefs.budget} placeholder="e.g. 3000"
              onChange={(e) => setPrefs((s) => ({ ...s, budget: e.target.value }))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Location</span>
            <input value={prefs.location} placeholder="City, state…"
              onChange={(e) => setPrefs((s) => ({ ...s, location: e.target.value }))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Type</span>
            <select value={prefs.type} onChange={(e) => setPrefs((s) => ({ ...s, type: e.target.value }))} className={inputCls}>
              <option value="">Any</option>
              {TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Min bedrooms</span>
            <select value={prefs.bedrooms} onChange={(e) => setPrefs((s) => ({ ...s, bedrooms: e.target.value }))} className={inputCls}>
              <option value="">Any</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </label>
        </div>

        {amenityOptions.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Preferred amenities</p>
            <div className="flex flex-wrap gap-2">
              {amenityOptions.map((a) => {
                const on = prefs.amenities.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      on ? "border-blue-500 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-blue-300"
                    }`}>
                    {on ? "✓ " : ""}{a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {active && (
          <div className="mt-3 flex items-center justify-between border-t border-blue-100 pt-3">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{ranked!.filter((r) => r.pct > 0).length}</span> matching properties
            </p>
            <button onClick={reset} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-50">
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          {active ? "Recommended for you" : "All properties"}
          <span className="ml-1.5 text-sm font-normal text-slate-400">({shown.length})</span>
        </h2>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">No properties listed yet.</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ p, pct, reasons }, i) => (
            <Link
              key={p.id}
              href={`/listings/${p.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/10"
            >
              {/* Image */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                {p.photoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${p.photoId}`} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl text-slate-300">🏢</div>
                )}
                {/* badges over the image */}
                {active && pct > 0 && i < 3 && (
                  <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-900 shadow">★ Top match</span>
                )}
                {active ? (
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow ${
                    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-600" : "bg-slate-500"
                  }`}>
                    {pct}% match
                  </span>
                ) : (
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow ${p.available ? "bg-emerald-500 text-white" : "bg-slate-700/80 text-white"}`}>
                    {p.available ? "Available" : "Occupied"}
                  </span>
                )}
                {/* price chip */}
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-blue-700 shadow backdrop-blur">
                  {money(p.rent)}<span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-800">{p.name}</h3>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{typeLabel(p.type)}</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  {p.address}
                </p>

                {/* feature pills */}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                  {p.rooms != null && p.rooms > 0 && <Pill icon="🛏">{p.rooms} bd</Pill>}
                  {p.bathrooms != null && <Pill icon="🛁">{p.bathrooms} ba</Pill>}
                  {p.areaSqft != null && <Pill icon="📐">{p.areaSqft.toLocaleString()} sqft</Pill>}
                </div>

                {active && reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {reasons.map((r) => (
                      <span key={r} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{r}</span>
                    ))}
                  </div>
                )}

                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-transform group-hover:translate-x-0.5">
                  View details <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium">
      <span aria-hidden>{icon}</span>
      {children}
    </span>
  );
}
