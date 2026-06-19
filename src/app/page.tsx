import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { Nav } from "./_landing/Nav";
import { Reveal } from "./_landing/Reveal";
import { PurchaseForm } from "./_landing/PurchaseForm";
import { HeroShowcase } from "./_landing/HeroShowcase";
import { Faq } from "./_landing/Faq";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Modern Tenant & Property Management",
  description:
    "Lease Lord unifies landlords, tenants and administrators on one platform — properties, leases, online rent, maintenance, complaints and two-way reviews.",
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const CAPABILITIES = [
  "Property Management",
  "Lease Agreements",
  "Online Rent",
  "Auto Invoicing",
  "Maintenance",
  "Complaints",
  "Two-way Reviews",
  "Notifications",
  "Audit Logs",
  "Reports & Analytics",
  "Document Vault",
  "Role-based Access",
];


const FEATURES = [
  { icon: "🔐", title: "Secure Auth & RBAC", desc: "Role-based access keeps every portal scoped to exactly the right data." },
  { icon: "🏘️", title: "Property Management", desc: "Track properties, units, amenities, occupancy and availability in real time." },
  { icon: "📄", title: "Lease Lifecycle", desc: "Draft, activate, renew and terminate leases with signed contract storage." },
  { icon: "💳", title: "Online Rent", desc: "Collect rent via UPI, debit, credit and net banking with instant receipts." },
  { icon: "🧾", title: "Auto Invoicing", desc: "Monthly invoices generate automatically and flag overdue balances." },
  { icon: "🔧", title: "Maintenance", desc: "Photo-rich requests flow from Pending → Assigned → Resolved → Closed." },
  { icon: "📣", title: "Complaints", desc: "Threaded complaint tickets with responses, resolution and reopen." },
  { icon: "⭐", title: "Two-way Reviews", desc: "Landlords and tenants rate each other — publicly visible and moderated." },
  { icon: "🔔", title: "Notifications", desc: "Rent reminders, alerts and updates, plus installable PWA push." },
  { icon: "📊", title: "Reports & Analytics", desc: "Operational and financial insights with one-click CSV exports." },
  { icon: "🗂️", title: "Document Vault", desc: "Securely store leases, IDs and ownership proofs against each record." },
  { icon: "🛡️", title: "Audit Logging", desc: "Every meaningful action is recorded for accountability and compliance." },
];

const PRICING = [
  {
    plan: "STARTER",
    name: "Starter",
    price: "$19",
    cadence: "/month",
    tagline: "For individual landlords",
    highlighted: false,
    features: ["Up to 10 units", "Properties, tenants & leases", "Online rent & receipts", "Maintenance & complaints", "Basic reports"],
  },
  {
    plan: "PROFESSIONAL",
    name: "Professional",
    price: "$49",
    cadence: "/month",
    tagline: "For growing portfolios",
    highlighted: true,
    features: ["Up to 100 units", "Everything in Starter", "Automated invoicing & reminders", "Two-way reviews & ratings", "CSV exports & notifications", "Installable PWA"],
  },
  {
    plan: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    tagline: "For agencies & teams",
    highlighted: false,
    features: ["Unlimited units", "Master-admin oversight", "Full audit logs & document vault", "Priority support & SLA", "Onboarding assistance"],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export default async function Landing() {
  // Real property photos power the rotating hero showcase.
  const photos = await prisma.document.findMany({
    where: { type: "PHOTO", propertyId: { not: null }, property: { approved: true, listedPublic: true } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  const heroPhotoIds = photos.map((p) => p.id);

  return (
    <div className="relative w-full overflow-x-hidden text-slate-800">
      {/* Themed page backdrop — soft blue aurora behind every section */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-blue-50/70" />
        <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -right-48 top-1/3 h-[34rem] w-[34rem] rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-200/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
      </div>

      <Nav />

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
        {/* animated background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-white" />
          <div className="animate-blob absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-300/40 blur-3xl" />
          <div className="animate-blob absolute top-10 right-0 h-96 w-96 rounded-full bg-cyan-300/40 blur-3xl [animation-delay:-6s]" />
          <div className="animate-blob absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl [animation-delay:-12s]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              All-in-one rental platform
            </span>

            <h1 className="animate-fade-up mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl [--delay:80ms]">
              Property management,{" "}
              <span className="animate-gradient bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-600 bg-clip-text text-transparent">
                beautifully simplified
              </span>
            </h1>

            <p className="animate-fade-up mt-5 max-w-xl text-lg text-slate-600 [--delay:160ms]">
              Lease Lord brings landlords, tenants and administrators onto a single,
              secure platform — properties, leases, online rent, maintenance,
              complaints and trust-building two-way reviews.
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-4 [--delay:240ms]">
              <a
                href="#buy"
                className="shine rounded-full bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40"
              >
                Buy Lease Lord now
              </a>
              <Link
                href="/listings"
                className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700"
              >
                Browse properties
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-slate-600 transition-colors hover:text-blue-700"
              >
                Live demo
              </Link>
            </div>

            <div className="animate-fade-up mt-10 flex gap-8 [--delay:320ms]">
              {[
                { k: "3", v: "Role-based portals" },
                { k: "15+", v: "Built-in modules" },
                { k: "100%", v: "Web & installable" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="text-2xl font-extrabold text-slate-900">{s.k}</p>
                  <p className="text-xs text-slate-500">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero artwork — dynamic property showcase */}
          <HeroShowcase photoIds={heroPhotoIds} />
        </div>
      </section>

      {/* ===================== MARQUEE ===================== */}
      <section className="border-y border-slate-200 bg-slate-50/70 py-5">
        <div className="marquee-mask overflow-hidden">
          <div className="animate-marquee flex w-max gap-4">
            {[...CAPABILITIES, ...CAPABILITIES].map((c, i) => (
              <span
                key={i}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 shadow-sm"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== VIEW PROPERTIES CTA ===================== */}
      <section className="mx-auto max-w-7xl px-5 pt-20 sm:px-8">
        <Reveal>
          <Link
            href="/listings"
            className="group flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-sky-500 p-8 shadow-xl shadow-blue-600/20 transition-all hover:shadow-2xl hover:shadow-blue-600/30 sm:flex-row sm:p-10"
          >
            <div className="flex items-center gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur transition-transform duration-300 group-hover:scale-110">
                <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-5h6v5M9 11h.01M15 11h.01" />
                </svg>
              </span>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Looking for a place to rent?</h2>
                <p className="mt-1 text-sm text-blue-50 sm:text-base">
                  Browse verified properties and get instantly matched to your budget, location &amp; must-haves.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-blue-700 shadow-md transition-transform group-hover:-translate-y-0.5">
              🏠 View Properties
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </Reveal>
      </section>

      {/* ===================== WHAT IS A TMS ===================== */}
      <section id="what" className="scroll-anchor mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">What is it?</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              What is a Tenant Management System?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              A <strong className="font-semibold text-slate-900">Tenant Management System (TMS)</strong> is a
              single online platform that handles everything involved in renting
              out and living in a property — so landlords, tenants and
              administrators stop juggling spreadsheets, paperwork, cash and
              phone calls, and instead work from one connected source of truth.
            </p>
            <p className="mt-4 text-slate-600">
              In short, <span className="font-medium text-slate-800">tenant management</span> is the
              day-to-day work of running rentals: listing properties, signing
              leases, collecting rent, fixing maintenance issues, resolving
              complaints and keeping records. A TMS turns all of that into
              simple, trackable digital workflows that everyone can see in real
              time.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tour/landlord"
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
              >
                See how it works
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700"
              >
                Sign in
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: "🗂️", t: "Everything in one place", d: "Properties, leases, payments and documents — no more scattered files or lost paperwork." },
                { icon: "💸", t: "Rent without the chase", d: "Automatic invoices, online payments and reminders keep cash flow on time, every month." },
                { icon: "🛠️", t: "Issues, handled", d: "Tenants raise maintenance and complaints; landlords track them from request to resolved." },
                { icon: "👀", t: "Clear for everyone", d: "Each role sees exactly what they need — with reviews and notifications that build trust." },
              ].map((b) => (
                <div
                  key={b.t}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-600/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-2xl">
                    {b.icon}
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">{b.t}</h3>
                  <p className="mt-1.5 text-sm text-slate-500">{b.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section id="features" className="scroll-anchor relative bg-slate-50/70 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal as="div" className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Everything included</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              A complete management toolkit
            </h2>
            <p className="mt-4 text-slate-600">
              Twelve powerful modules covering every part of the rental lifecycle —
              all working together, out of the box.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 text-2xl transition-transform duration-300 group-hover:scale-110">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== STATS BAND ===================== */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600" />
        <div className="animate-blob pointer-events-none absolute -top-20 left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-blob pointer-events-none absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl [animation-delay:-8s]" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 text-center text-white sm:px-8 md:grid-cols-4">
          {[
            { k: "3", v: "Dedicated portals" },
            { k: "4", v: "Payment methods" },
            { k: "5★", v: "Two-way ratings" },
            { k: "24/7", v: "Online access" },
          ].map((s, i) => (
            <Reveal key={s.v} delay={i * 100}>
              <p className="text-4xl font-extrabold sm:text-5xl">{s.k}</p>
              <p className="mt-1 text-sm text-blue-100">{s.v}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== TESTIMONIALS ===================== */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Loved by both sides</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Landlords and tenants, finally on the same page
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { q: "Rent collection used to eat my weekends. Now invoices go out automatically and I see every payment, lease and request in one dashboard.", n: "Michael Anderson", r: "Landlord · 12 units", c: "from-blue-500 to-cyan-500" },
            { q: "Paying rent and raising a maintenance request takes seconds. No more chasing my landlord on the phone — and I have every receipt.", n: "Emily Davis", r: "Tenant", c: "from-emerald-500 to-teal-500" },
            { q: "As an admin I get full visibility — approvals, payments, disputes — and an audit trail for everything. Onboarding landlords is effortless.", n: "Sarah Johnson", r: "Master Admin", c: "from-violet-500 to-indigo-500" },
          ].map((t, i) => (
            <Reveal key={t.n} delay={i * 120}>
              <figure className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-600/10">
                <div className="text-amber-400">★★★★★</div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">“{t.q}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.c} text-sm font-bold text-white`}>{t.n.charAt(0)}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.n}</p>
                    <p className="text-xs text-slate-400">{t.r}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing" className="scroll-anchor mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Simple plans that scale with you
          </h2>
          <p className="mt-4 text-slate-600">Pick a plan and we&apos;ll set up your workspace. Switch anytime.</p>
        </Reveal>

        <div className="mt-14 grid items-stretch gap-7 lg:grid-cols-3">
          {PRICING.map((p, i) => (
            <Reveal key={p.plan} delay={i * 120}>
              <div
                className={`card-lift relative flex h-full flex-col rounded-3xl border p-8 ${
                  p.highlighted
                    ? "border-blue-300 bg-white shadow-2xl shadow-blue-600/15 ring-2 ring-blue-500/40"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {p.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-1 text-xs font-bold text-white shadow-md">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">{p.price}</span>
                  <span className="text-sm text-slate-400">{p.cadence}</span>
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#buy"
                  data-plan={p.plan}
                  className={`shine mt-8 rounded-full px-6 py-3 text-center text-sm font-bold transition-all hover:-translate-y-0.5 ${
                    p.highlighted
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700"
                      : "border border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {p.plan === "ENTERPRISE" ? "Contact sales" : `Choose ${p.name}`}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">FAQ</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-4 text-slate-600">Everything you need to know before getting started.</p>
        </Reveal>
        <Faq />
      </section>

      {/* ===================== BUY / CTA FORM ===================== */}
      <section id="buy" className="scroll-anchor relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
        <div className="animate-blob absolute -left-20 top-20 -z-10 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="animate-blob absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl [animation-delay:-7s]" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Get started</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Buy Lease Lord for your properties
            </h2>
            <p className="mt-4 text-slate-600">
              Tell us a little about your portfolio and we&apos;ll set up your
              workspace, migrate your data and walk you through onboarding.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                { icon: "⚡", t: "Fast onboarding", d: "Live in days, not weeks — we handle the heavy lifting." },
                { icon: "🔒", t: "Secure by design", d: "Role-based access, audit logs and encrypted documents." },
                { icon: "🤝", t: "Real human support", d: "Talk to a specialist who knows property management." },
              ].map((b) => (
                <li key={b.t} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-slate-200">
                    {b.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{b.t}</p>
                    <p className="text-sm text-slate-500">{b.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-2xl shadow-blue-900/10 backdrop-blur sm:p-8">
              <h3 className="text-xl font-bold text-slate-900">Request access</h3>
              <p className="mb-6 mt-1 text-sm text-slate-500">
                Fill in the form and our team will reach out shortly.
              </p>
              <PurchaseForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <SiteFooter />
    </div>
  );
}
