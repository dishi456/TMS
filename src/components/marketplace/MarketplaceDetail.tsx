import Link from "next/link";
import { Badge, Card, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ZoomImage } from "@/components/ZoomImage";
import { formatPrice, conditionLabel, getMarketplaceListing } from "@/lib/marketplace";
import { FavoriteButton } from "./FavoriteButton";
import { setListingStatus, deleteListing } from "@/app/actions/marketplace";

type Listing = NonNullable<Awaited<ReturnType<typeof getMarketplaceListing>>>;

export function MarketplaceDetail({ listing, basePath }: { listing: Listing; basePath: string }) {
  return (
    <div className="space-y-4">
      <Link href={basePath} className="text-sm text-slate-500 hover:text-slate-700">← Back to marketplace</Link>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Gallery */}
        <div className="lg:col-span-2">
          {listing.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {listing.images.map((src, i) => (
                <div key={src} className={i === 0 ? "col-span-2" : ""}>
                  <ZoomImage src={src} alt={listing.title} className="w-full rounded-xl object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-5xl text-slate-300">🛍️</div>
          )}
        </div>

        {/* Info + actions */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg font-semibold text-slate-900">{listing.title}</h1>
              <FavoriteButton listingId={listing.id} initial={listing.favorited} withLabel />
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatPrice(listing.price, listing.currency)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="sky">{listing.category}</Badge>
              <Badge tone="slate">{conditionLabel(listing.condition)}</Badge>
              {listing.status === "SOLD" ? <Badge tone="red">Sold</Badge> : <Badge tone="green">Available</Badge>}
            </div>
            {listing.location && <p className="mt-2 text-sm text-slate-500">📍 {listing.location}</p>}
            <p className="mt-1 text-xs text-slate-400">Listed {listing.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
          </Card>

          {/* Seller */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Seller</p>
            <div className="mt-2 flex items-center gap-3">
              {listing.seller.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.seller.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{listing.seller.name.charAt(0).toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                  {listing.seller.name}
                  {listing.seller.verified && <span title="Verified" className="text-blue-500">✓</span>}
                </p>
                <p className="text-xs text-slate-400">{listing.seller.listings} listing{listing.seller.listings === 1 ? "" : "s"}{listing.seller.city ? ` · ${listing.seller.city}` : ""}</p>
              </div>
            </div>
            {!listing.mine && listing.status !== "SOLD" && (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                {listing.seller.phone && <a href={`tel:${listing.seller.phone}`} className={`${btn("secondary")} w-full`}>📞 {listing.seller.phone}</a>}
                {listing.seller.email && <a href={`mailto:${listing.seller.email}?subject=${encodeURIComponent("Interested: " + listing.title)}`} className={`${btn("primary")} w-full`}>✉️ Contact seller</a>}
              </div>
            )}
          </Card>

          {/* Owner controls */}
          {listing.mine && (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Manage your listing</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`${basePath}/${listing.id}/edit`} className={btn("secondary")}>Edit</Link>
                <form action={setListingStatus}>
                  <input type="hidden" name="basePath" value={basePath} />
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="status" value={listing.status === "SOLD" ? "AVAILABLE" : "SOLD"} />
                  <button className={btn("secondary")}>{listing.status === "SOLD" ? "Mark available" : "Mark as sold"}</button>
                </form>
                <form action={deleteListing}>
                  <input type="hidden" name="basePath" value={basePath} />
                  <input type="hidden" name="id" value={listing.id} />
                  <ConfirmButton message="Delete this listing permanently?" className={btn("danger")}>Delete</ConfirmButton>
                </form>
              </div>
            </Card>
          )}
        </div>
      </div>

      {listing.description && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{listing.description}</p>
        </Card>
      )}
    </div>
  );
}
