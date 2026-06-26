import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getMarketplaceListing } from "@/lib/marketplace";
import { MarketplaceDetail } from "@/components/marketplace/MarketplaceDetail";

export const metadata: Metadata = { title: "Listing" };
export const dynamic = "force-dynamic";

export default async function LandlordListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const listing = await getMarketplaceListing(id, session!.user.id);
  if (!listing) notFound();
  return <MarketplaceDetail listing={listing} basePath="/landlord/marketplace" />;
}
