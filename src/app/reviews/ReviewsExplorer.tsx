"use client";

import { useMemo, useState } from "react";

export type ReviewItem = {
  id: string;
  stars: number;
  feedback: string | null;
  recommend: boolean;
  rateeName: string;
  by: string;
  propertyName: string;
  address: string;
  date: string;
};

type Tab = "landlord" | "tenant";

function StarRow({ value, size = "text-base" }: { value: number; size?: string }) {
  return (
    <span className={`whitespace-nowrap leading-none ${size}`} aria-label={`${value} out of 5 stars`}>
      <span className="text-amber-400">{"★".repeat(value)}</span>
      <span className="text-slate-200">{"★".repeat(5 - value)}</span>
    </span>
  );
}

// Deterministic gradient avatar from a name.
const AVATAR_GRADIENTS = [
  "from-blue-500 to-sky-400",
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-cyan-500 to-blue-400",
];
function avatarFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function norm(s: string) {
  return s.toLowerCase().trim();
}

function PinIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function ReviewsExplorer({
  landlord,
  tenant,
  llAvg,
  llCount,
  tnAvg,
  tnCount,
}: {
  landlord: ReviewItem[];
  tenant: ReviewItem[];
  llAvg: number | null;
  llCount: number;
  tnAvg: number | null;
  tnCount: number;
}) {
  const [tab, setTab] = useState<Tab>("landlord");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");

  const source = tab === "landlord" ? landlord : tenant;
  const avg = tab === "landlord" ? llAvg : tnAvg;
  const count = tab === "landlord" ? llCount : tnCount;
  const recommendRate = source.length
    ? Math.round((source.filter((r) => r.recommend).length / source.length) * 100)
    : 0;

  const filtered = useMemo(() => {
    const n = norm(name);
    const l = norm(location);
    const a = norm(area);
    return source.filter((r) => {
      if (n && !norm(r.rateeName).includes(n) && !norm(r.by).includes(n)) return false;
      if (l && !norm(r.address).includes(l)) return false;
      if (a && !norm(r.address).includes(a) && !norm(r.propertyName).includes(a)) return false;
      return true;
    });
  }, [source, name, location, area]);

  const hasFilters = !!(name || location || area);
  const clear = () => {
    setName("");
    setLocation("");
    setArea("");
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div>
      {/* Tabs — fully separate landlord vs tenant sections */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <TabButton active={tab === "landlord"} onClick={() => setTab("landlord")}>
            🏢 Landlord reviews
            <Pill active={tab === "landlord"}>{llCount}</Pill>
          </TabButton>
          <TabButton active={tab === "tenant"} onClick={() => setTab("tenant")}>
            🏠 Tenant reviews
            <Pill active={tab === "tenant"}>{tnCount}</Pill>
          </TabButton>
        </div>
      </div>

      {/* Summary stat chips */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat
          label="Average rating"
          value={avg ? avg.toFixed(1) : "—"}
          sub={<StarRow value={Math.round(avg ?? 0)} size="text-xs" />}
        />
        <Stat label="Total reviews" value={String(count)} sub={<span className="text-xs text-slate-400">on this side</span>} />
        <Stat label="Would recommend" value={`${recommendRate}%`} sub={<span className="text-xs text-emerald-500">positive</span>} />
      </div>

      {/* Section heading */}
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-800">
          {tab === "landlord" ? "Landlord reviews" : "Tenant reviews"}
        </h2>
        <p className="text-xs text-slate-400">
          {tab === "landlord" ? "What tenants say about their landlords" : "What landlords say about their tenants"}
        </p>
      </div>

      {/* Filter bar — name, location, area */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tab === "landlord" ? "Landlord or reviewer…" : "Tenant or reviewer…"}
              className={inputCls}
            />
          </Field>
          <Field label="Location">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><PinIcon /></span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, state…"
              className={inputCls}
            />
          </Field>
          <Field label="Area">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><PinIcon /></span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Street, property…"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {source.length} reviews
          </p>
          {hasFilters && (
            <button onClick={clear} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <p className="text-3xl">🔍</p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {source.length === 0 ? "No reviews yet" : "No reviews match your filters"}
            </p>
            {source.length > 0 && hasFilters && (
              <button onClick={clear} className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((r) => (
            <article
              key={r.id}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5"
            >
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarFor(r.rateeName)} text-sm font-bold text-white shadow-sm`}>
                  {r.rateeName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{r.rateeName}</p>
                  <StarRow value={r.stars} />
                </div>
                {r.recommend && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                    ✓ Recommends
                  </span>
                )}
              </div>

              {r.feedback ? (
                <p className="relative mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                  <span className="absolute -left-1 -top-2 text-2xl leading-none text-blue-100">“</span>
                  <span className="pl-3">{r.feedback}</span>
                </p>
              ) : (
                <p className="mt-4 flex-1 text-sm italic text-slate-300">No written feedback.</p>
              )}

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 truncate">
                  <PinIcon />
                  <span className="truncate">{r.propertyName} · {r.address}</span>
                </span>
                <span className="shrink-0">by {r.by} · {r.date}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-1.5 text-xs font-semibold ${active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>
      {children}
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <div className="mt-0.5">{sub}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="relative block">{children}</span>
    </label>
  );
}
