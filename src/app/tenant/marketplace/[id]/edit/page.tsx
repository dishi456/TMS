import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { getMarketplaceListing } from "@/lib/marketplace";
import { ListingForm } from "@/components/marketplace/ListingForm";

export const metadata: Metadata = { title: "Edit listing" };
export const dynamic = "force-dynamic";

export default async function TenantEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const listing = await getMarketplaceListing(id, session!.user.id);
  if (!listing || !listing.mine) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Edit listing</h1>
      <Card>
        <ListingForm
          basePath="/tenant/marketplace"
          defaults={{
            id: listing.id,
            title: listing.title,
            description: listing.description ?? undefined,
            category: listing.category,
            condition: listing.condition,
            price: listing.price,
            currency: listing.currency,
            location: listing.location ?? undefined,
            images: listing.images,
          }}
        />
      </Card>
    </div>
  );
}
