"use client";

import { useWishlist } from "@/lib/useWishlist";

// Heart toggle that lives on top of a card <Link>. Stops the click from
// navigating so saving never opens the listing.
export function FavoriteButton({ id, className = "" }: { id: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(id);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save property"}
      title={saved ? "Saved" : "Save"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-black/5 backdrop-blur transition-transform hover:scale-110 active:scale-95 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 transition-colors ${saved ? "fill-rose-500 stroke-rose-500" : "fill-none stroke-slate-500"}`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}
