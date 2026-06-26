import Link from "next/link";
import { auth } from "@/auth";
import { btn, inputClass } from "@/components/ui";
import { CATEGORIES, CONDITIONS, listMarketplace, type MarketScope } from "@/lib/marketplace";
import { MarketplaceGrid } from "./MarketplaceGrid";

type SP = { q?: string; category?: string; condition?: string; sort?: string; scope?: string };

const TABS: { key: MarketScope; label: string }[] = [
  { key: "all", label: "Browse" },
  { key: "mine", label: "My listings" },
  { key: "favorites", label: "Wishlist" },
];

export async function MarketplaceBrowse({ basePath, params }: { basePath: string; params: SP }) {
  const session = await auth();
  const userId = session!.user.id;
  const scope: MarketScope = params.scope === "mine" || params.scope === "favorites" ? params.scope : "all";
  const listings = await listMarketplace(userId, { q: params.q, category: params.category, condition: params.condition, sort: params.sort, scope });

  const tabHref = (s: MarketScope) => (s === "all" ? basePath : `${basePath}?scope=${s}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Marketplace</h1>
          <p className="text-sm text-slate-500">Buy and sell furniture, appliances and more with your community.</p>
        </div>
        <Link href={`${basePath}/new`} className={btn("primary")}>+ Post an item</Link>
      </div>

      {/* Scope tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = scope === t.key;
          return (
            <Link key={t.key} href={tabHref(t.key)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Filters (GET form keeps the current scope) */}
      <form method="get" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input type="hidden" name="scope" value={scope} />
        <input name="q" defaultValue={params.q} placeholder="Search…" className={`${inputClass} col-span-2 py-2 text-sm`} />
        <select name="category" defaultValue={params.category ?? ""} className={`${inputClass} py-2 text-sm`}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="condition" defaultValue={params.condition ?? ""} className={`${inputClass} py-2 text-sm`}>
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select name="sort" defaultValue={params.sort ?? "newest"} className={`${inputClass} py-2 text-sm`}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
        <button className={`${btn("secondary")} col-span-2 sm:col-span-5`}>Apply filters</button>
      </form>

      <MarketplaceGrid listings={listings} basePath={basePath} />
    </div>
  );
}
