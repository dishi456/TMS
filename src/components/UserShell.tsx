"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useWishlist } from "@/lib/useWishlist";

type NavItem = { href: string; label: string; icon: keyof typeof icons };

const NAV: NavItem[] = [
  { href: "/account", label: "Home", icon: "grid" },
  { href: "/listings", label: "Browse", icon: "search" },
  { href: "/account/saved", label: "Saved", icon: "heart" },
  { href: "/account/enquiries", label: "Enquiries", icon: "chat" },
  { href: "/account/profile", label: "Account", icon: "user" },
];

function isActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(href + "/");
}

export function UserShell({
  userName,
  enquiryCount,
  children,
}: {
  userName: string;
  enquiryCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { count: savedCount } = useWishlist();
  const current = NAV.find((n) => isActive(pathname, n.href));

  const badgeFor = (href: string) =>
    href === "/account/saved" ? savedCount : href === "/account/enquiries" ? enquiryCount : 0;

  return (
    <div className="min-h-dvh bg-gray-100 font-sans text-gray-800">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          <Link href="/account"><Logo className="h-9" /></Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-gray-200/70 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className={active ? "text-gray-700" : "text-gray-400"}>{icons[item.icon]}</span>
                {item.label}
                {badge > 0 && (
                  <span className="ml-auto rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">{userName.charAt(0).toUpperCase()}</span>
            <p className="truncate text-sm font-medium text-gray-800">{userName}</p>
          </div>
          <form action={logout}>
            <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600">
              {icons.logout}
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-7 lg:hidden" />
            <h1 className="text-base font-semibold text-gray-800">{current?.label ?? "My Account"}</h1>
          </div>
          <ProfileMenu
            name={userName}
            role="Member"
            items={[
              { href: "/account/profile", label: "Account & password", icon: "👤" },
              { href: "/account/saved", label: "Saved properties", icon: "❤️" },
              { href: "/account/enquiries", label: "My enquiries", icon: "💬" },
            ]}
          />
        </header>

        <main className="mx-auto max-w-5xl px-4 py-5 pb-24 lg:px-6 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-200 bg-white lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const badge = badgeFor(item.href);
          return (
            <Link key={item.href} href={item.href} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${active ? "text-gray-900" : "text-gray-400"}`}>
              {icons[item.icon]}
              {item.label}
              {badge > 0 && <span className="absolute right-1/4 top-1 h-2 w-2 rounded-full bg-rose-500" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const ic = "h-5 w-5";
const icons = {
  grid: (<svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>),
  search: (<svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>),
  heart: (<svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>),
  chat: (<svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>),
  user: (<svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  logout: (<svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>),
};
