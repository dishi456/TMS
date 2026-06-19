"use client";

import { useState } from "react";

const FAQS: [string, string][] = [
  ["Is Lease Lord free to try?", "Yes — browsing properties, saving favourites and chatting with owners is completely free. Landlords get a free workspace to set up; paid plans unlock higher unit limits and automation."],
  ["How do tenants pay rent?", "Tenants pay online via card, UPI or net banking and get an instant receipt, or request to pay by cash which the landlord confirms. Every payment is logged with a downloadable invoice."],
  ["Can I manage multiple properties and tenants?", "Absolutely. Landlords manage their whole portfolio — properties, units, leases, tenants, rent, maintenance and complaints — all scoped to just their own data."],
  ["Is my data secure?", "Every portal is role-based, documents are stored against each record, and every meaningful action is written to an audit log. Sensitive files are access-gated."],
  ["Do renters need an account to contact an owner?", "No account needed — a visitor can message an owner with just their name and a verified email. When they rent, the landlord can upgrade them to a full tenant account."],
  ["Can I install it like an app?", "Yes — Lease Lord is a PWA. Install it on your phone or desktop for one-tap access and push notifications, with no app store required."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto mt-12 max-w-3xl space-y-3">
      {FAQS.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className={`overflow-hidden rounded-2xl border bg-white transition-colors ${isOpen ? "border-blue-300 shadow-sm" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-semibold text-slate-800">{q}</span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${isOpen ? "rotate-180 bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </span>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
