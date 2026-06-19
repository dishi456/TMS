"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { PORTALS } from "@/lib/portals";

const SHORT: Record<string, string> = {
  "master-admin": "Admin",
  landlord: "Landlord",
  tenant: "Tenant",
  marketplace: "Marketplace",
};

// Shared public site header.
//   variant="overlay" — fixed, transparent-at-top (landing hero).
//   variant="solid"   — static white bar that scrolls with the page (sub-pages).
//   account — when set (signed-in viewer), shows "My account" instead of Sign in/Get started.
export function Nav({ variant = "overlay", account = null }: { variant?: "overlay" | "solid"; account?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const solid = variant === "solid";

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

  const navLink = "rounded-full px-3.5 py-2 text-[15px] font-bold text-slate-700 transition-colors hover:bg-blue-100 hover:text-blue-700";

  return (
    <header className={solid ? "relative z-40" : "fixed inset-x-0 top-0 z-50"}>
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-violet-500" />

      <div className={`transition-all duration-300 ${solid ? "border-b border-slate-200 bg-white" : scrolled ? "border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center transition-transform hover:scale-[1.03]">
            <Logo className="h-10" />
          </Link>

          {/* Center link island — portals are top-level items */}
          <div className="hidden items-center gap-0.5 rounded-full border border-blue-100 bg-blue-50/70 px-1.5 py-1 shadow-sm backdrop-blur xl:flex">
            <a href="/#what" className={navLink}>What is it?</a>
            {PORTALS.map((p) => (
              <Link key={p.slug} href={`/tour/${p.slug}`} className={`flex items-center gap-1.5 ${navLink}`}>
                <span aria-hidden className="text-base leading-none">{p.icon}</span>
                {SHORT[p.slug]}
              </Link>
            ))}
            <a href="/#features" className={navLink}>Features</a>
            <a href="/#pricing" className={navLink}>Pricing</a>
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            <Link href="/listings" className="rounded-full bg-blue-50 px-4 py-2.5 text-[15px] font-bold text-blue-700 transition-colors hover:bg-blue-100">Browse properties</Link>
            {account ? (
              <Link href={account} className="shine inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-[15px] font-bold text-white shadow-md shadow-blue-600/25 transition-all hover:-translate-y-0.5">
                My account →
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-full bg-blue-50 px-4 py-2.5 text-[15px] font-bold text-blue-700 transition-colors hover:bg-blue-100">Sign in</Link>
                <a href="/#buy" className="shine group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-[15px] font-bold text-white shadow-md shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/40">
                  Get started
                  <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
                </a>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button type="button" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 xl:hidden">
            <div className="space-y-1.5">
              <span className={`block h-0.5 w-6 bg-current transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-6 bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-6 bg-current transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
            </div>
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="animate-fade-up max-h-[80vh] overflow-y-auto border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-lg xl:hidden">
          <div className="flex flex-col gap-1">
            <a href="/#what" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">What is it?</a>
            <a href="/#features" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Features</a>
            <a href="/#pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Pricing</a>
            <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Portals</p>
            {PORTALS.map((p) => (
              <Link key={p.slug} href={`/tour/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-100">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${p.gradient} text-base`}>{p.icon}</span>
                <span className="text-sm font-medium text-slate-700">{p.name}</span>
              </Link>
            ))}
            <Link href="/listings" onClick={() => setOpen(false)} className="mt-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Browse properties</Link>
            {account ? (
              <Link href={account} onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2.5 text-center text-sm font-semibold text-white">My account</Link>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link href="/login" className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">Sign in</Link>
                <a href="/#buy" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2.5 text-center text-sm font-semibold text-white">Get started</a>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
