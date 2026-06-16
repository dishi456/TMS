"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/useWishlist";

export function AccountQuickLinks({ enquiryCount }: { enquiryCount: number }) {
  const { count: saved } = useWishlist();

  const cards = [
    { href: "/listings", emoji: "🔎", title: "Browse properties", sub: "Find your next home", tone: "from-blue-500 to-sky-400" },
    { href: "/account/saved", emoji: "❤️", title: "Saved", sub: `${saved} ${saved === 1 ? "property" : "properties"}`, tone: "from-rose-500 to-pink-400" },
    { href: "/account/enquiries", emoji: "💬", title: "Enquiries", sub: enquiryCount > 0 ? `${enquiryCount} new repl${enquiryCount === 1 ? "y" : "ies"}` : "Your chats", tone: "from-emerald-500 to-teal-400" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Link key={c.href} href={c.href} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-xl shadow-sm`}>{c.emoji}</div>
          <p className="font-semibold text-slate-800">{c.title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{c.sub}</p>
          <span className="absolute right-4 top-5 text-slate-300 transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      ))}
    </div>
  );
}
