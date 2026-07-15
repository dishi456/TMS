import type { Metadata } from "next";
import { PropertyBrowse } from "@/components/PropertyBrowse";

export const metadata: Metadata = { title: "Marketplace" };
export const dynamic = "force-dynamic";

export default async function TenantMarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  return <PropertyBrowse params={params} />;
}
