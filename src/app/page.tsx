import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Nav } from "./_landing/Nav";
import { Reveal } from "./_landing/Reveal";
import { PurchaseForm } from "./_landing/PurchaseForm";

export const metadata: Metadata = {
  title: "Modern Tenant & Property Management",
  description:
    "TMS unifies landlords, tenants and administrators on one platform — properties, leases, online rent, maintenance, complaints and two-way reviews.",
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

const PORTALS = [
  {
    icon: "👑",
    name: "Master Admin",
    tag: "Total control",
    gradient: "from-violet-500 to-indigo-600",
    ring: "group-hover:shadow-indigo-500/40",
    blurb:
      "The command centre for the whole platform — oversee every landlord, tenant, property and transaction.",
    features: [
      "Platform-wide dashboard: revenue, occupancy, dues & ratings",
      "Approve & verify landlords, properties and ownership documents",
      "Create, verify, suspend or remove any user",
      "Oversee all leases, payments, refunds & financial reports",
      "Assign and track maintenance across the platform",
      "Moderate reviews — flag, remove or suspend privileges",
      "Full activity & audit trail of every action",
    ],
  },
  {
    icon: "🏢",
    name: "Landlord Portal",
    tag: "Run your portfolio",
    gradient: "from-blue-500 to-cyan-500",
    ring: "group-hover:shadow-blue-500/40",
    blurb:
      "Everything a property owner needs to manage units, tenants and rent — scoped to only their own properties.",
    features: [
      "Portfolio dashboard with lease-expiry & payment alerts",
      "Add & edit properties, units, amenities and deposits",
      "Onboard tenants and assign them to units",
      "Create leases, upload signed contracts, renew & terminate",
      "Generate invoices, send reminders, export rent reports",
      "Approve, reject & assign maintenance to technicians",
      "Respond to complaints and rate tenants after lease end",
    ],
  },
  {
    icon: "🏠",
    name: "Tenant Portal",
    tag: "Renting made easy",
    gradient: "from-emerald-500 to-teal-500",
    ring: "group-hover:shadow-emerald-500/40",
    blurb:
      "A simple, mobile-friendly home for tenants to pay rent, raise requests and stay informed.",
    features: [
      "Personal dashboard: residence, dues, payments & rating",
      "Pay rent online via UPI, cards or net banking",
      "Download receipts and view full payment history",
      "Raise maintenance requests with photos & priority",
      "Submit complaints and reopen them if needed",
      "View lease details and manage profile & documents",
      "Rate landlords and get real-time notifications",
    ],
  },
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

const STEPS = [
  { n: "01", title: "Sign up & get verified", desc: "Create your landlord account; the Master Admin verifies your documents." },
  { n: "02", title: "Add properties & tenants", desc: "List units, onboard tenants and link them with digital lease agreements." },
  { n: "03", title: "Collect rent online", desc: "Auto-generated invoices and online payments keep cash flow on time." },
  { n: "04", title: "Manage & grow", desc: "Handle maintenance, complaints and reviews from one clean dashboard." },
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

export default function Landing() {
  return (
    <div className="relative w-full overflow-x-hidden bg-white text-slate-800">
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
              TMS brings landlords, tenants and administrators onto a single,
              secure platform — properties, leases, online rent, maintenance,
              complaints and trust-building two-way reviews.
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-4 [--delay:240ms]">
              <a
                href="#buy"
                className="shine rounded-full bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40"
              >
                Buy TMS now
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

          {/* Hero artwork — faux dashboard */}
          <div className="animate-fade-up relative [--delay:200ms]">
            <div className="animate-float relative mx-auto max-w-md">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-blue-500/20 to-cyan-400/20 blur-2xl" />
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-2xl shadow-blue-900/10 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">TMS · Dashboard</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { l: "Monthly Revenue", v: "$42k", c: "from-blue-500 to-cyan-500" },
                    { l: "Occupied", v: "86%", c: "from-emerald-500 to-teal-500" },
                    { l: "Pending Rent", v: "$8.4k", c: "from-amber-500 to-orange-500" },
                    { l: "Avg Rating", v: "4.7★", c: "from-violet-500 to-indigo-500" },
                  ].map((t) => (
                    <div key={t.l} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <p className="text-[11px] text-slate-500">{t.l}</p>
                      <p className={`mt-0.5 bg-gradient-to-r ${t.c} bg-clip-text text-lg font-extrabold text-transparent`}>
                        {t.v}
                      </p>
                    </div>
                  ))}
                </div>

                {/* mini chart */}
                <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600">Rent collection</p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">+12%</span>
                  </div>
                  <div className="flex h-24 items-end gap-2">
                    {[45, 62, 38, 72, 55, 84, 68, 92].map((h, i) => (
                      <div
                        key={i}
                        className="animate-bar flex-1 rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400"
                        style={{ height: `${h}%`, ["--bar-delay" as string]: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* floating chips */}
              <div className="animate-float-slow absolute -left-8 top-20 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:block">
                <p className="text-[11px] text-slate-400">Rent paid</p>
                <p className="text-sm font-bold text-emerald-600">✓ $2,500</p>
              </div>
              <div className="animate-float absolute -right-6 bottom-16 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl [animation-delay:-3s] sm:block">
                <p className="text-[11px] text-slate-400">New review</p>
                <p className="text-sm font-bold text-amber-500">★★★★★</p>
              </div>
            </div>
          </div>
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
              <a
                href="#how"
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
              >
                See how it works
              </a>
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

      {/* ===================== PORTALS ===================== */}
      <section id="portals" className="scroll-anchor mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Three portals, one platform</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Built for everyone in the rental journey
          </h2>
          <p className="mt-4 text-slate-600">
            Each role gets a focused experience with secure, role-based access —
            no clutter, no overreach.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-7 lg:grid-cols-3">
          {PORTALS.map((p, i) => (
            <Reveal key={p.name} delay={i * 120}>
              <div className={`card-lift group h-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm ${p.ring}`}>
                <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${p.gradient} text-3xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                  {p.icon}
                </div>
                <p className={`bg-gradient-to-r ${p.gradient} bg-clip-text text-xs font-bold uppercase tracking-wider text-transparent`}>
                  {p.tag}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{p.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{p.blurb}</p>

                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${p.gradient} text-[10px] font-bold text-white`}>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
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

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="scroll-anchor mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal as="div" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Up and running in four steps
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-8 md:grid-cols-4">
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-blue-600 shadow-lg ring-1 ring-slate-200 transition-transform duration-300 hover:scale-110">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== STATS BAND ===================== */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600" />
        <div className="animate-blob absolute -top-20 left-10 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-blob absolute -bottom-20 right-10 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl [animation-delay:-8s]" />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 text-center text-white sm:px-8 md:grid-cols-4">
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

      {/* ===================== BUY / CTA FORM ===================== */}
      <section id="buy" className="scroll-anchor relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
        <div className="animate-blob absolute -left-20 top-20 -z-10 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="animate-blob absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl [animation-delay:-7s]" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Get started</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Buy TMS for your properties
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
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row">
          <div className="flex items-center gap-3">
            <Logo className="h-8" />
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <a href="#portals" className="hover:text-slate-900">Portals</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#buy" className="hover:text-slate-900">Buy</a>
            <Link href="/login" className="hover:text-slate-900">Sign in</Link>
          </nav>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Tenant Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
