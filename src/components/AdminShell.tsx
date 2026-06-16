"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ProfileMenu } from "@/components/ProfileMenu";

type NavItem = { href: string; label: string; icon: keyof typeof icons; mobile?: boolean };

const NAV: NavItem[] = [
  { href: "/master-admin", label: "Dashboard", icon: "grid", mobile: true },
  { href: "/master-admin/users", label: "User Management", icon: "users", mobile: true },
  { href: "/master-admin/properties", label: "Properties", icon: "building", mobile: true },
  { href: "/master-admin/leases", label: "Leases", icon: "doc" },
  { href: "/master-admin/payments", label: "Payments", icon: "card", mobile: true },
  { href: "/master-admin/maintenance", label: "Maintenance", icon: "wrench" },
  { href: "/master-admin/reviews", label: "Reviews", icon: "star", mobile: true },
  { href: "/master-admin/automation", label: "Rent Automation", icon: "bolt" },
  { href: "/master-admin/activity", label: "Activity Log", icon: "activity" },
  { href: "/master-admin/notifications", label: "Notifications", icon: "bell" },
  { href: "/master-admin/account", label: "Account", icon: "cog" },
];

function isActive(pathname: string, href: string) {
  return href === "/master-admin" ? pathname === "/master-admin" : pathname.startsWith(href);
}

export function AdminShell({
  userName,
  unread = 0,
  children,
}: {
  userName: string;
  unread?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = NAV.find((n) => isActive(pathname, n.href));
  const mobileNav = NAV.filter((n) => n.mobile);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      {/* ===== Desktop sidebar ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-4">
          <Logo className="h-9" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-blue-600" : "text-slate-400"}>
                  {icons[item.icon]}
                </span>
                {item.label}
                {item.href === "/master-admin/notifications" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{unread}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {userName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
              <p className="text-[11px] text-slate-400">Master Admin</p>
            </div>
          </div>
          <form action={logout}>
            <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600">
              {icons.logout}
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ===== Main column (offset for sidebar on desktop) ===== */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-7 lg:hidden" />
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                {current?.label ?? "Dashboard"}
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                Master Admin · Platform control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/master-admin/notifications" className="relative text-slate-500 hover:text-slate-700">
              {icons.bell}
              {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unread}</span>}
            </Link>
            <ProfileMenu
              name={userName}
              role="Master Admin"
              items={[
                { href: "/master-admin/account", label: "Account & password", icon: "⚙️" },
                { href: "/master-admin/notifications", label: "Notifications", icon: "🔔" },
                { href: "/master-admin/activity", label: "Activity log", icon: "📋" },
              ]}
            />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-5 pb-24 lg:px-6 lg:pb-8">{children}</main>
      </div>

      {/* ===== Mobile bottom tab bar ===== */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-200 bg-white lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileNav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                active ? "text-blue-600" : "text-slate-400"
              }`}
            >
              {icons[item.icon]}
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Minimal inline icon set (Heroicons-style, 20px stroke).
const ic = "h-5 w-5";
const icons = {
  grid: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  users: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  building: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1" />
    </svg>
  ),
  doc: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  card: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  ),
  wrench: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7z" />
    </svg>
  ),
  star: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  logout: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  activity: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  bolt: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  bell: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  cog: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  ),
};
