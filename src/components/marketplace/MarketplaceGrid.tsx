import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatPrice, conditionLabel, type ListingCard } from "@/lib/marketplace";
import { FavoriteButton } from "./FavoriteButton";

export function MarketplaceGrid({ listings, basePath }: { listings: ListingCard[]; basePath: string }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-400">Nothing here yet.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => (
        <Link key={l.id} href={`${basePath}/${l.id}`} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="relative aspect-square bg-slate-100">
            {l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">🛍️</div>
            )}
            <div className="absolute right-2 top-2">
              <FavoriteButton listingId={l.id} initial={l.favorited} />
            </div>
            {l.status === "SOLD" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800">SOLD</span>
              </div>
            )}
            {l.mine && <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">Mine</span>}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <p className="line-clamp-1 text-sm font-semibold text-slate-800">{l.title}</p>
            <p className="text-sm font-bold text-slate-900">{formatPrice(l.price, l.currency)}</p>
            <div className="mt-auto flex items-center justify-between pt-1">
              <Badge tone="slate">{conditionLabel(l.condition)}</Badge>
              {l.location && <span className="line-clamp-1 text-[11px] text-slate-400">📍 {l.location}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
