"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

// Take a marketplace listing down (moderation).
export async function removeListing(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { sellerId: true, title: true } });
  if (!listing) {
    revalidatePath("/master-admin/marketplace");
    return;
  }
  await prisma.marketplaceListing.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "marketplace.remove", entity: "MarketplaceListing", entityId: id, metadata: { title: listing.title } });
  await notify(listing.sellerId, { type: "marketplace", title: "Listing removed", body: `“${listing.title}” was removed by an administrator.`, link: "/" });
  revalidatePath("/master-admin/marketplace");
}

// Flip a listing between AVAILABLE and SOLD (moderation override).
export async function setListingStatusAdmin(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const status = formData.get("status") === "SOLD" ? "SOLD" : "AVAILABLE";
  await prisma.marketplaceListing.update({ where: { id }, data: { status } });
  await audit({ actorId: session.user.id, action: "marketplace.status", entity: "MarketplaceListing", entityId: id, metadata: { status } });
  revalidatePath("/master-admin/marketplace");
}
