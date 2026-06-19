import type { PortalKind } from "@/lib/portals";

// Faux "screenshots" of each portal. Every portal has several views; the tour
// page shows the first in the hero and the rest in an "inside the portal"
// showcase. Pure markup, themed per portal.
export type View = {
  caption: string;
  desc: string;
  activeNav: number;
  url: string;
  title: string;
  stats: { l: string; v: string }[];
  rows: { a: string; b: string; tone: string }[];
};
type ScreenSet = { nav: string[]; views: View[] };

export const SCREENS: Record<PortalKind, ScreenSet> = {
  "master-admin": {
    nav: ["Dashboard", "Users", "Properties", "Approvals", "Payments", "Reviews", "Audit"],
    views: [
      {
        caption: "Platform dashboard", desc: "Revenue, occupancy, dues and ratings across every landlord — at a glance.",
        activeNav: 0, url: "leaselord.com/master-admin", title: "Platform overview",
        stats: [{ l: "Landlords", v: "24" }, { l: "Properties", v: "138" }, { l: "Revenue", v: "$92k" }, { l: "Pending", v: "5" }],
        rows: [{ a: "Approve landlord · Sarah J.", b: "Pending", tone: "amber" }, { a: "Verify property · Cedar Heights", b: "Review", tone: "blue" }, { a: "Flagged review · #2231", b: "Moderate", tone: "rose" }],
      },
      {
        caption: "Approvals & verification", desc: "Approve new landlords, verify ownership documents and publish properties before they go live.",
        activeNav: 3, url: "leaselord.com/master-admin/approvals", title: "Approvals queue",
        stats: [{ l: "Pending", v: "5" }, { l: "Landlords", v: "2" }, { l: "Properties", v: "3" }, { l: "Docs", v: "4" }],
        rows: [{ a: "Sarah Johnson · landlord", b: "Approve", tone: "emerald" }, { a: "Cedar Heights · property", b: "Review", tone: "blue" }, { a: "Aadhaar · ownership doc", b: "Verify", tone: "amber" }],
      },
      {
        caption: "User management", desc: "Create, verify, suspend or remove any account — landlords, tenants, seekers and admins.",
        activeNav: 1, url: "leaselord.com/master-admin/users", title: "All users",
        stats: [{ l: "Users", v: "312" }, { l: "Landlords", v: "24" }, { l: "Tenants", v: "280" }, { l: "Seekers", v: "8" }],
        rows: [{ a: "Michael Anderson · Landlord", b: "Active", tone: "emerald" }, { a: "Emily Davis · Tenant", b: "Active", tone: "emerald" }, { a: "Alex Carter · Seeker", b: "Convert", tone: "blue" }],
      },
    ],
  },
  landlord: {
    nav: ["Dashboard", "Requests", "Properties", "Tenants", "Leases", "Rent", "Maintenance"],
    views: [
      {
        caption: "Portfolio dashboard", desc: "Lease-expiry and payment alerts with your whole portfolio in a single view.",
        activeNav: 0, url: "leaselord.com/landlord", title: "Your portfolio",
        stats: [{ l: "Properties", v: "6" }, { l: "Occupied", v: "4" }, { l: "Collected", v: "$14k" }, { l: "Requests", v: "3" }],
        rows: [{ a: "New application · Maple Court", b: "Pending", tone: "amber" }, { a: "Rent received · Emily D.", b: "Paid", tone: "emerald" }, { a: "Visit request · Cedar Heights", b: "Confirm", tone: "blue" }],
      },
      {
        caption: "Requests inbox", desc: "Applications, visit bookings and enquiries from seekers — all triaged in one place.",
        activeNav: 1, url: "leaselord.com/landlord/requests", title: "Requests",
        stats: [{ l: "Applications", v: "3" }, { l: "Visits", v: "1" }, { l: "Enquiries", v: "2" }, { l: "New", v: "6" }],
        rows: [{ a: "Laura Bennett · application", b: "Pending", tone: "amber" }, { a: "Daniel Okoro · visit", b: "Confirm", tone: "blue" }, { a: "Rahul Mehta · enquiry", b: "2 new", tone: "rose" }],
      },
      {
        caption: "Rent & invoices", desc: "Auto-generate invoices, collect rent online or by cash, and export reports.",
        activeNav: 5, url: "leaselord.com/landlord/rent", title: "Rent collection",
        stats: [{ l: "Collected", v: "$14k" }, { l: "Pending", v: "$2.5k" }, { l: "Invoices", v: "8" }, { l: "Overdue", v: "1" }],
        rows: [{ a: "June · Emily Davis", b: "Paid", tone: "emerald" }, { a: "June · James Wilson", b: "Pending", tone: "amber" }, { a: "May · Olivia Brown", b: "Paid", tone: "emerald" }],
      },
    ],
  },
  tenant: {
    nav: ["Home", "Pay Rent", "Maintenance", "Complaints", "Messages", "Lease"],
    views: [
      {
        caption: "Tenant dashboard", desc: "Your residence, dues and rating in a clean, mobile-friendly home screen.",
        activeNav: 0, url: "leaselord.com/tenant", title: "My home",
        stats: [{ l: "Rent due", v: "$2,500" }, { l: "Due in", v: "6 days" }, { l: "Requests", v: "1" }, { l: "Rating", v: "4.8★" }],
        rows: [{ a: "Rent · June", b: "Pay now", tone: "blue" }, { a: "Maintenance · AC fix", b: "In progress", tone: "amber" }, { a: "Receipt · May rent", b: "Paid", tone: "emerald" }],
      },
      {
        caption: "Online rent", desc: "Pay by card, UPI or net banking — or request cash — and download an instant receipt.",
        activeNav: 1, url: "leaselord.com/tenant/payments", title: "Pay rent",
        stats: [{ l: "Due", v: "$2,500" }, { l: "Method", v: "Card" }, { l: "History", v: "11" }, { l: "Receipts", v: "11" }],
        rows: [{ a: "June rent · $2,500", b: "Pay", tone: "blue" }, { a: "May rent · $2,500", b: "Paid", tone: "emerald" }, { a: "Apr rent · $2,500", b: "Paid", tone: "emerald" }],
      },
      {
        caption: "Maintenance", desc: "Raise photo-rich requests with a priority and track them from open to resolved.",
        activeNav: 2, url: "leaselord.com/tenant/maintenance", title: "Maintenance",
        stats: [{ l: "Open", v: "1" }, { l: "Resolved", v: "4" }, { l: "Avg fix", v: "2d" }, { l: "Photos", v: "Yes" }],
        rows: [{ a: "AC not cooling", b: "In progress", tone: "amber" }, { a: "Leaky tap", b: "Resolved", tone: "emerald" }, { a: "Repaint wall", b: "Closed", tone: "blue" }],
      },
    ],
  },
  marketplace: {
    nav: ["All", "Apartment", "House", "Room", "Commercial"],
    views: [
      {
        caption: "Browse listings", desc: "Search, filter and sort verified rentals by city, price, type and amenities.",
        activeNav: 0, url: "leaselord.com/listings", title: "Properties for rent",
        stats: [{ l: "Listings", v: "120+" }, { l: "Verified", v: "100%" }, { l: "Cities", v: "18" }, { l: "Brokerage", v: "$0" }],
        rows: [{ a: "Cedar Heights · 2 BHK · Denver", b: "$2,300", tone: "blue" }, { a: "Orchard Greens · 3 BHK · Portland", b: "$2,700", tone: "blue" }, { a: "City Square Studio · SF", b: "$1,800", tone: "blue" }],
      },
      {
        caption: "Property detail", desc: "Rich detail pages with photo galleries, full specs and a chat-with-owner panel.",
        activeNav: 1, url: "leaselord.com/listings/.../204107", title: "Cedar Heights",
        stats: [{ l: "Rent", v: "$2,300" }, { l: "Beds", v: "2" }, { l: "Bath", v: "2" }, { l: "Area", v: "1,150" }],
        rows: [{ a: "Gallery · 8 photos", b: "View", tone: "blue" }, { a: "Amenities · Gym, Rooftop", b: "Listed", tone: "emerald" }, { a: "Owner · Sarah J.", b: "Verified", tone: "emerald" }],
      },
      {
        caption: "Saved & enquiries", desc: "A one-tap wishlist and your conversations with owners — no account required.",
        activeNav: 0, url: "leaselord.com/account/saved", title: "Saved properties",
        stats: [{ l: "Saved", v: "3" }, { l: "Enquiries", v: "2" }, { l: "New", v: "1" }, { l: "Visits", v: "1" }],
        rows: [{ a: "Cedar Heights", b: "Saved", tone: "rose" }, { a: "Maple Court", b: "Enquiry", tone: "blue" }, { a: "Orchard Greens", b: "Saved", tone: "rose" }],
      },
    ],
  },
};

const TONE: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  rose: "bg-rose-50 text-rose-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

export function PortalMockup({ kind, gradient, view = 0 }: { kind: PortalKind; gradient: string; view?: number }) {
  const set = SCREENS[kind];
  const s = set.views[view] ?? set.views[0];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-xs text-slate-400 ring-1 ring-slate-200">{s.url}</span>
      </div>

      <div className="flex">
        <aside className="hidden w-40 shrink-0 flex-col gap-1 border-r border-slate-100 bg-white p-3 sm:flex">
          {set.nav.map((n, i) => (
            <div key={n} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ${i === s.activeNav ? `bg-gradient-to-r ${gradient} text-white` : "text-slate-500"}`}>
              <span className={`h-2 w-2 rounded-full ${i === s.activeNav ? "bg-white" : "bg-slate-300"}`} />
              {n}
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1 bg-slate-50/60 p-4">
          <p className="text-base font-bold text-slate-800">{s.title}</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {s.stats.map((t) => (
              <div key={t.l} className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[11px] text-slate-400">{t.l}</p>
                <p className={`mt-0.5 bg-gradient-to-r ${gradient} bg-clip-text text-lg font-extrabold text-transparent`}>{t.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white">
            {s.rows.map((r) => (
              <div key={r.a} className="flex items-center justify-between gap-3 px-3.5 py-3">
                <span className="truncate text-[13px] text-slate-600">{r.a}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[r.tone]}`}>{r.b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
