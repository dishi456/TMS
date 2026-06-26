import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ListingForm } from "@/components/marketplace/ListingForm";

export const metadata: Metadata = { title: "Post an item" };
export const dynamic = "force-dynamic";

export default async function TenantNewListingPage() {
  const session = await auth();
  const me = await prisma.user.findUnique({ where: { id: session!.user.id }, select: { currency: true } });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Post an item for sale</h1>
      <Card><ListingForm basePath="/tenant/marketplace" defaultCurrency={me?.currency ?? "INR"} /></Card>
    </div>
  );
}
