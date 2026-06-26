"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/marketplace";

export function FavoriteButton({ listingId, initial, withLabel = false }: { listingId: string; initial: boolean; withLabel?: boolean }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Optimistic flip; reconcile with the server's authoritative value.
    setFav((v) => !v);
    start(async () => {
      const r = await toggleFavorite(listingId);
      setFav(r.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={fav}
      title={fav ? "Remove from wishlist" : "Add to wishlist"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm transition-colors ${fav ? "bg-red-50 text-red-600" : "bg-white/90 text-slate-500 hover:text-red-500"} ${withLabel ? "border border-slate-200" : ""}`}
    >
      <span>{fav ? "♥" : "♡"}</span>
      {withLabel && <span className="text-xs font-medium">{fav ? "Wishlisted" : "Wishlist"}</span>}
    </button>
  );
}
