import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tenant Management System",
    short_name: "TMS",
    description:
      "Manage properties, leases, rent, maintenance and complaints — for admins, landlords and tenants.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#2563EB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Pay Rent", short_name: "Pay", url: "/tenant/payments" },
      { name: "New Maintenance Request", short_name: "Maintenance", url: "/tenant/maintenance/new" },
      { name: "Landlord Dashboard", short_name: "Landlord", url: "/landlord" },
    ],
  };
}
