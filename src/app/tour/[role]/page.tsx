import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { roleHome, type Role } from "@/lib/roles";
import { SiteFooter } from "@/components/SiteFooter";
import { Nav } from "@/app/_landing/Nav";
import { PORTALS, getPortal } from "@/lib/portals";
import { PortalMockup, SCREENS } from "./PortalMockup";

export function generateStaticParams() {
  return PORTALS.map((p) => ({ role: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  const p = getPortal(role);
  return { title: p ? `${p.name} — how it works` : "Portals" };
}

export default async function TourPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const portal = getPortal(role);
  if (!portal) notFound();

  const extraViews = SCREENS[portal.slug].views.slice(1); // screens beyond the hero

  const session = await auth();
  const home = session?.user ? (roleHome[session.user.role as Role] ?? "/account") : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden text-slate-800">
      {/* themed backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-blue-50/70" />
        <div className={`absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br ${portal.gradient} opacity-20 blur-3xl`} />
        <div className="absolute -right-48 top-1/3 h-[34rem] w-[34rem] rounded-full bg-cyan-200/25 blur-3xl" />
      </div>

      <Nav variant="solid" account={home} />

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto max-w-7xl px-5 pt-14 pb-10 sm:px-8">
          <p className="text-xs font-medium text-slate-400"><Link href="/" className="hover:text-slate-600">Home</Link> / Portals / {portal.name}</p>
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${portal.gradient} text-3xl shadow-lg`}>{portal.icon}</div>
              <p className={`mt-5 bg-gradient-to-r ${portal.gradient} bg-clip-text text-xs font-bold uppercase tracking-wider text-transparent`}>{portal.tag}</p>
              <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">{portal.name}</h1>
              <p className="mt-5 max-w-lg text-xl leading-relaxed text-slate-600">{portal.blurb}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={portal.cta.href} className={`rounded-full bg-gradient-to-r ${portal.gradient} px-7 py-3.5 text-base font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5`}>
                  {portal.cta.label} →
                </Link>
                <Link href="/listings" className="rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-bold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700">Browse properties</Link>
              </div>
            </div>
            <PortalMockup kind={portal.slug} gradient={portal.gradient} />
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{portal.name} in four steps</h2>
          </div>
          <div className="relative mt-14 grid gap-8 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent md:block" />
            {portal.steps.map((s, i) => (
              <div key={s.t} className="relative text-center">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-extrabold shadow-lg ring-1 ring-slate-200 bg-gradient-to-br ${portal.gradient} bg-clip-text text-transparent`}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{s.t}</h3>
                <p className="mt-2 text-base text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* inside the portal — multiple screens */}
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">A closer look</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Inside the {portal.name.toLowerCase().replace(" portal", "")}</h2>
          </div>
          <div className="mt-14 space-y-16">
            {extraViews.map((v, i) => {
              const realIdx = i + 1; // views.slice(1) started at index 1
              const flip = i % 2 === 1;
              return (
                <div key={v.caption} className="grid items-center gap-10 lg:grid-cols-2">
                  <div className={flip ? "lg:order-2" : ""}>
                    <PortalMockup kind={portal.slug} gradient={portal.gradient} view={realIdx} />
                  </div>
                  <div className={flip ? "lg:order-1" : ""}>
                    <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${portal.gradient} bg-clip-text text-sm font-bold uppercase tracking-wider text-transparent`}>
                      Screen {realIdx + 1}
                    </span>
                    <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{v.caption}</h3>
                    <p className="mt-3 text-lg leading-relaxed text-slate-600">{v.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* features */}
        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur sm:p-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Everything in the {portal.name.toLowerCase()}</h2>
            <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {portal.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-base text-slate-600">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${portal.gradient} text-xs font-bold text-white`}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* explore other portals */}
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <h2 className="text-center text-xl font-bold text-slate-900">Explore the other portals</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {PORTALS.filter((p) => p.slug !== portal.slug).map((p) => (
              <Link key={p.slug} href={`/tour/${p.slug}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.gradient} text-2xl shadow`}>{p.icon}</span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="truncate text-xs text-slate-500">{p.tag}</p>
                </div>
                <span className="ml-auto text-slate-300 transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
          <div className={`overflow-hidden rounded-3xl bg-gradient-to-r ${portal.gradient} p-8 text-center shadow-xl sm:p-12`}>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Ready to get started?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/85">Join Lease Lord and bring your whole rental journey onto one secure platform.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={portal.cta.href} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-md transition-transform hover:-translate-y-0.5">{portal.cta.label}</Link>
              <Link href="/register" className="rounded-full bg-white/15 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/40 backdrop-blur transition-colors hover:bg-white/25">Create account</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
