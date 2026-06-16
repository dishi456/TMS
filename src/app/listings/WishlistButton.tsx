"use client";

import { useWishlist, OPEN_WISHLIST_EVENT } from "@/lib/useWishlist";

// Header "Saved" control with a live count. Asks the browser below to switch
// to the saved view (it listens for OPEN_WISHLIST_EVENT).
export function WishlistButton() {
  const { count } = useWishlist();

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_WISHLIST_EVENT))}
      className="relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      <span className="hidden sm:inline">Saved</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white" style={{ height: 18, minWidth: 18 }}>
          {count}
        </span>
      )}
    </button>
  );
}
