"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/marketplace";

export type ListingFormState = { error?: string } | undefined;

const categoryValues = CATEGORIES as readonly string[];

const listingSchema = z.object({
  title: z.string().trim().min(2, "Enter a title."),
  description: z.string().trim().optional(),
  category: z.string().refine((c) => categoryValues.includes(c), "Choose a category."),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]),
  price: z.coerce.number().nonnegative("Enter a valid price."),
  currency: z.enum(["INR", "USD", "CAD", "GBP", "EUR", "AUD"]),
  location: z.string().trim().optional(),
});

function safePath(p: unknown): string {
  const s = String(p || "");
  return s.startsWith("/tenant/marketplace") || s.startsWith("/landlord/marketplace") ? s : "/tenant/marketplace";
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// Image URLs must be /api/files/{id} paths the user actually uploaded.
async function ownedImages(urls: string[], userId: string): Promise<string[]> {
  const valid = urls.filter((u) => /^\/api\/files\/[a-zA-Z0-9]+$/.test(u)).slice(0, 8);
  if (valid.length === 0) return [];
  const ids = valid.map((u) => u.split("/").pop()!);
  const owned = await prisma.document.findMany({ where: { id: { in: ids }, ownerId: userId }, select: { id: true } });
  const ownedSet = new Set(owned.map((d) => d.id));
  return valid.filter((u) => ownedSet.has(u.split("/").pop()!));
}

export async function createListing(_prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const userId = await requireUserId();
  const basePath = safePath(formData.get("basePath"));
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const images = await ownedImages(formData.getAll("images").map(String), userId);

  const l = await prisma.marketplaceListing.create({
    data: {
      sellerId: userId,
      title: d.title,
      description: d.description || null,
      category: d.category,
      condition: d.condition,
      price: d.price,
      currency: d.currency,
      location: d.location || null,
      images,
      status: "AVAILABLE",
    },
    select: { id: true },
  });
  revalidatePath(basePath);
  redirect(`${basePath}/${l.id}`);
}

export async function updateListing(_prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const userId = await requireUserId();
  const basePath = safePath(formData.get("basePath"));
  const id = String(formData.get("id") || "");
  const owns = await prisma.marketplaceListing.findFirst({ where: { id, sellerId: userId }, select: { id: true } });
  if (!owns) return { error: "Listing not found." };
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const images = await ownedImages(formData.getAll("images").map(String), userId);

  await prisma.marketplaceListing.update({
    where: { id },
    data: {
      title: d.title,
      description: d.description || null,
      category: d.category,
      condition: d.condition,
      price: d.price,
      currency: d.currency,
      location: d.location || null,
      images,
    },
  });
  revalidatePath(basePath);
  redirect(`${basePath}/${id}`);
}

export async function setListingStatus(formData: FormData) {
  const userId = await requireUserId();
  const basePath = safePath(formData.get("basePath"));
  const id = String(formData.get("id") || "");
  const status = formData.get("status") === "SOLD" ? "SOLD" : "AVAILABLE";
  const owns = await prisma.marketplaceListing.findFirst({ where: { id, sellerId: userId }, select: { id: true } });
  if (owns) await prisma.marketplaceListing.update({ where: { id }, data: { status } });
  revalidatePath(`${basePath}/${id}`);
  redirect(`${basePath}/${id}`);
}

export async function deleteListing(formData: FormData) {
  const userId = await requireUserId();
  const basePath = safePath(formData.get("basePath"));
  const id = String(formData.get("id") || "");
  const owns = await prisma.marketplaceListing.findFirst({ where: { id, sellerId: userId }, select: { id: true } });
  if (owns) await prisma.marketplaceListing.delete({ where: { id } });
  revalidatePath(basePath);
  redirect(basePath);
}

// Wishlist toggle — called directly from the client FavoriteButton.
export async function toggleFavorite(listingId: string): Promise<{ favorited: boolean }> {
  const userId = await requireUserId();
  const existing = await prisma.marketplaceFavorite.findFirst({ where: { userId, listingId }, select: { id: true } });
  if (existing) {
    await prisma.marketplaceFavorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  const listing = await prisma.marketplaceListing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) return { favorited: false };
  await prisma.marketplaceFavorite.create({ data: { userId, listingId } });
  return { favorited: true };
}
