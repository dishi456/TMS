"use client";

import { useCallback, useEffect, useState } from "react";

// Anonymous, browser-local "saved properties" list — no account needed.
// Synced across components in the same tab via a custom event, and across
// tabs via the native `storage` event.
const KEY = "ll:wishlist";
const EVENT = "ll:wishlist-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return {
    ids,
    count: ids.length,
    has: useCallback((id: string) => ids.includes(id), [ids]),
    toggle,
  };
}

// Fired by the header heart to ask the browser to switch to the saved view.
export const OPEN_WISHLIST_EVENT = "ll:open-wishlist";
