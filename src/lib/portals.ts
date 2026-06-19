// Shared data for the four portal "how it works" pages and the landing
// Portals section. `slug` powers the /tour/[role] routes.

export type PortalKind = "master-admin" | "landlord" | "tenant" | "marketplace";

export type Portal = {
  slug: PortalKind;
  icon: string;
  name: string;
  tag: string;
  gradient: string; // tailwind from-…to-…
  ring: string;
  blurb: string;
  features: string[];
  steps: { t: string; d: string }[];
  cta: { label: string; href: string };
};

export const PORTALS: Portal[] = [
  {
    slug: "master-admin",
    icon: "👑",
    name: "Master Admin",
    tag: "Total control",
    gradient: "from-violet-500 to-indigo-600",
    ring: "group-hover:shadow-indigo-500/40",
    blurb: "The command centre for the whole platform — oversee every landlord, tenant, property and transaction.",
    features: [
      "Platform-wide dashboard: revenue, occupancy, dues & ratings",
      "Approve & verify landlords, properties and ownership documents",
      "Create, verify, suspend or remove any user",
      "Oversee all leases, payments, refunds & financial reports",
      "Assign and track maintenance across the platform",
      "Moderate reviews — flag, remove or suspend privileges",
      "Full activity & audit trail of every action",
    ],
    steps: [
      { t: "Review & approve", d: "Verify new landlords and their ownership documents before they go live." },
      { t: "Approve listings", d: "Check each submitted property and publish it to the marketplace." },
      { t: "Oversee operations", d: "Monitor payments, leases, disputes and platform-wide reports in real time." },
      { t: "Moderate & audit", d: "Moderate reviews, manage users, and trace every action via the audit log." },
    ],
    cta: { label: "Open the admin portal", href: "/login" },
  },
  {
    slug: "landlord",
    icon: "🏢",
    name: "Landlord Portal",
    tag: "Run your portfolio",
    gradient: "from-blue-500 to-cyan-500",
    ring: "group-hover:shadow-blue-500/40",
    blurb: "Everything a property owner needs to manage properties, tenants and rent — scoped to only their own portfolio.",
    features: [
      "Portfolio dashboard with lease-expiry & payment alerts",
      "Add & edit properties, amenities, photos and deposits",
      "Onboard tenants or convert a seeker into your tenant",
      "Create leases, upload signed contracts, renew & terminate",
      "Generate invoices, send reminders, export rent reports",
      "Approve, reject & assign maintenance requests",
      "A unified Requests inbox: applications, visits & enquiries",
    ],
    steps: [
      { t: "Sign up & get verified", d: "Create your landlord account; the admin verifies your documents." },
      { t: "Add & list properties", d: "Add your properties with photos and details, then publish them." },
      { t: "Onboard tenants & leases", d: "Add tenants or upgrade a seeker, and link them with digital leases." },
      { t: "Collect rent & manage", d: "Auto-invoice, collect rent online, and handle requests from one inbox." },
    ],
    cta: { label: "Become a landlord", href: "/register" },
  },
  {
    slug: "tenant",
    icon: "🏠",
    name: "Tenant Portal",
    tag: "Renting made easy",
    gradient: "from-emerald-500 to-teal-500",
    ring: "group-hover:shadow-emerald-500/40",
    blurb: "A simple, mobile-friendly home for tenants to pay rent, raise requests and stay informed.",
    features: [
      "Personal dashboard: residence, dues, payments & rating",
      "Pay rent online via card, UPI or net banking — or cash",
      "Download receipts and view full payment history",
      "Raise maintenance requests with photos & priority",
      "Submit complaints and reopen them if needed",
      "View lease details and manage profile & documents",
      "Rate your landlord and get real-time notifications",
    ],
    steps: [
      { t: "Get added by your landlord", d: "Your landlord adds you, or upgrades your seeker account to a tenant." },
      { t: "See your lease & dues", d: "View your residence, lease terms and any pending rent at a glance." },
      { t: "Pay rent online", d: "Pay in a tap and download an instant receipt — never lose a record." },
      { t: "Request & rate", d: "Raise maintenance or complaints, and rate your landlord after your stay." },
    ],
    cta: { label: "Tenant sign in", href: "/login" },
  },
  {
    slug: "marketplace",
    icon: "🏙️",
    name: "Marketplace",
    tag: "Find your next home",
    gradient: "from-amber-500 to-orange-500",
    ring: "group-hover:shadow-amber-500/40",
    blurb: "A public, OLX-style marketplace where anyone can discover verified rentals and reach owners directly.",
    features: [
      "Browse verified listings with search, filters & sort",
      "Filter by price, bedrooms, furnishing, amenities & city",
      "Save favourites with a one-tap wishlist — no login needed",
      "Rich detail pages with photo galleries and full specs",
      "Chat with the owner directly after a quick email verify",
      "Apply to rent or book a visit in seconds",
      "Clean SEO-friendly URLs for every property",
    ],
    steps: [
      { t: "Browse listings", d: "Search verified rentals by city, price, type and amenities." },
      { t: "Save your favourites", d: "Heart the ones you like — they're kept on your device instantly." },
      { t: "Chat with the owner", d: "Message the owner directly with just your name and a verified email." },
      { t: "Apply or book a visit", d: "Apply to rent or schedule a viewing — the landlord takes it from there." },
    ],
    cta: { label: "Browse properties", href: "/listings" },
  },
];

export const getPortal = (slug: string) => PORTALS.find((p) => p.slug === slug);
