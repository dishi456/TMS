import Link from "next/link";
import { Logo } from "@/components/Logo";

// Shared marketing footer used across the public pages (landing, listings,
// reviews, …). In-page section links use `/#anchor` so they work from any route.
export function SiteFooter() {
  return (
    <footer className="relative mt-8 border-t border-slate-200 bg-gradient-to-b from-white to-blue-50/60">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-violet-500" />

      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Logo className="h-9" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              The all-in-one rental platform — properties, leases, online rent, maintenance and two-way reviews, for landlords, tenants and admins.
            </p>
            {/* light-blue capsule chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[["Apartments", "/listings"], ["Houses", "/listings"], ["Rooms", "/listings"], ["Commercial", "/listings"], ["Reviews", "/reviews"]].map(([label, href]) => (
                <Link key={label} href={href} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100">
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              {[
                { label: "Twitter", d: "M18.9 2H22l-7.5 8.6L23 22h-6.8l-5-6.6L5.5 22H2.3l8-9.2L1.5 2h6.9l4.5 6 5.9-6z" },
                { label: "LinkedIn", d: "M4.98 3.5A2.5 2.5 0 1 0 5 8.5 2.5 2.5 0 0 0 4.98 3.5zM3 9.5h4V21H3zM10 9.5h3.8v1.57h.05c.53-1 1.83-2.07 3.77-2.07 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4z" },
                { label: "GitHub", d: "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" },
              ].map((s) => (
                <a key={s.label} href="#" aria-label={s.label} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d={s.d} /></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Columns */}
          <FooterCol title="Product" links={[["Marketplace", "/tour/marketplace"], ["Features", "/#features"], ["Pricing", "/#pricing"], ["Browse properties", "/listings"]]} />
          <FooterCol title="Company" links={[["What is it?", "/#what"], ["Landlords", "/tour/landlord"], ["Tenants", "/tour/tenant"], ["Reviews", "/reviews"]]} />
          <FooterCol title="Get started" links={[["Create account", "/register"], ["Sign in", "/login"], ["Landlord portal", "/login"], ["Tenant portal", "/login"]]} />
        </div>
      </div>

      <div className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-slate-400 sm:px-8 md:flex-row">
          <p>© {new Date().getFullYear()} Lease Lord. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <a href="#" className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-100">Privacy</a>
            <a href="#" className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-100">Terms</a>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label + href}>
            <Link href={href} className="text-sm text-slate-500 transition-colors hover:text-blue-600">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
