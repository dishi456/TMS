"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ProfileMenu } from "@/components/ProfileMenu";

type NavItem = { href: string; label: string; icon: keyof typeof icons };

const NAV: NavItem[] = [
  { href: "/landlord", label: "Dashboard", icon: "grid" },
  { href: "/landlord/properties", label: "Properties", icon: "building" },
  { href: "/landlord/tenants", label: "Tenants", icon: "users" },
  { href: "/landlord/applications", label: "Applications", icon: "inbox" },
  { href: "/landlord/visits", label: "Visits", icon: "calendar" },
  { href: "/landlord/inquiries", label: "Chats", icon: "help" },
  { href: "/landlord/leases", label: "Leases", icon: "doc" },
  { href: "/landlord/rent", label: "Rent", icon: "card" },
  { href: "/landlord/maintenance", label: "Maintenance", icon: "wrench" },
  { href: "/landlord/complaints", label: "Complaints", icon: "chat" },
  { href: "/landlord/messages", label: "Messages", icon: "messages" },
  { href: "/landlord/reviews", label: "Rate Tenants", icon: "star" },
  { href: "/landlord/verification", label: "Verification", icon: "badge" },
  { href: "/landlord/notifications", label: "Notifications", icon: "bell" },
  { href: "/landlord/account", label: "Account", icon: "cog" },
];

function isActive(pathname: string, href: string) {
  return href === "/landlord" ? pathname === "/landlord" : pathname.startsWith(href);
}

export function LandlordShell({
  userName,
  verified,
  unread = 0,
  chatUnread = 0,
  children,
}: {
  userName: string;
  verified: boolean;
  unread?: number;
  chatUnread?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = NAV.find((n) => isActive(pathname, n.href));

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800">
      {/* Desktop sidebar */}
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
                  active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-blue-600" : "text-slate-400"}>{icons[item.icon]}</span>
                {item.label}
                {item.href === "/landlord/verification" && !verified && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-amber-400" />
                )}
                {item.href === "/landlord/notifications" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{unread}</span>
                )}
                {item.href === "/landlord/inquiries" && chatUnread > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{chatUnread}</span>
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
              <p className="text-[11px] text-slate-400">{verified ? "Verified" : "Unverified"}</p>
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

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-7 lg:hidden" />
            <h1 className="text-base font-semibold text-slate-800">{pathname === "/landlord" ? "Landlord Dashboard" : current?.label ?? "Landlord Portal"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/landlord/notifications" className="relative text-slate-500 hover:text-slate-700">
              {icons.bell}
              {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unread}</span>}
            </Link>
            <ProfileMenu
              name={userName}
              role="Landlord"
              items={[
                { href: "/landlord/account", label: "Account & password", icon: "⚙️" },
                { href: "/landlord/verification", label: "Upload documents", icon: "📄" },
                { href: "/landlord/notifications", label: "Notifications", icon: "🔔" },
              ]}
            />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-5 pb-24 lg:px-6 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav — horizontally scrollable so every module is reachable */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 overflow-x-auto border-t border-slate-200 bg-white px-1 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
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

const ic = "h-5 w-5";
const icons = {
  grid: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  building: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1" /></svg>
  ),
  users: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  doc: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
  ),
  card: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
  ),
  wrench: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7z" /></svg>
  ),
  chat: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  ),
  messages: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
  ),
  help: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" /><path d="M12 17h.01" /></svg>
  ),
  inbox: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
  ),
  calendar: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ),
  star: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
  ),
  badge: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  logout: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
  ),
  bell: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
  ),
  cog: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></svg>
  ),
};
