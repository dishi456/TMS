import type { Metadata } from "next";
import { MarketplaceBrowse } from "@/components/marketplace/MarketplaceBrowse";

export const metadata: Metadata = { title: "Marketplace" };
export const dynamic = "force-dynamic";

export default async function LandlordMarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  return <MarketplaceBrowse basePath="/landlord/marketplace" params={params} />;
}
