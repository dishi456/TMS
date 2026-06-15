"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

export type NavItem = { href: string; label: string; icon: string };

export function PortalShell({
  title,
  userName,
  nav,
  children,
}: {
  title: string;
  userName: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100">
      {/* App-style top bar (sits under the iOS status bar via safe-area padding) */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div>
          <h1 className="text-base font-semibold leading-tight">{title}</h1>
          <p className="text-xs text-slate-400">{userName}</p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
            Sign out
          </button>
        </form>
      </header>

      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">{children}</main>

      {/* Native-style bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-around border-t border-slate-800 bg-slate-950/90 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                active ? "text-blue-400" : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
