"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generatePropertyRef } from "@/lib/property-ref";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { saveFile, removeFile } from "@/lib/storage";

export type FormState = { error?: string; success?: string } | undefined;
const MAX_BYTES = 8 * 1024 * 1024;

// Empty form fields come through as "" — treat those as "not provided" (null).
const optInt = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.number().int().min(0).max(100000).optional(),
);
const checkbox = z.preprocess((v) => v === "true" || v === "on", z.boolean());

const schema = z.object({
  name: z.string().min(2, "Name is too short."),
  type: z.enum(["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL", "OTHER"]),
  address: z.string().min(3, "Enter an address."),
  description: z.string().trim().optional(),
  rentAmount: z.coerce.number().nonnegative("Rent must be ≥ 0."),
  securityDeposit: z.coerce.number().nonnegative().default(0),
  numberOfUnits: z.coerce.number().int().min(1).default(1),
  noticePeriodDays: z.coerce.number().int().min(0).max(365).default(30),
  rooms: optInt,
  bathrooms: optInt,
  balconies: optInt,
  floor: optInt,
  totalFloors: optInt,
  areaSqft: optInt,
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"]).default("UNFURNISHED"),
  hasLobby: checkbox.default(false),
  hasParking: checkbox.default(false),
  hasLift: checkbox.default(false),
  powerBackup: checkbox.default(false),
  carpetAreaSqft: optInt,
  parkingSpots: optInt,
  maintenanceMonthly: optInt,
  facing: z.string().trim().optional(),
  listedBy: z.enum(["OWNER", "DEALER", "BUILDER"]).default("OWNER"),
  projectName: z.string().trim().optional(),
  bachelorsAllowed: checkbox.default(true),
  listedPublic: checkbox.default(true),
  amenities: z.string().trim().optional(),
  availability: z.enum(["AVAILABLE", "OCCUPIED", "UNAVAILABLE"]),
});

function toData(d: z.infer<typeof schema>) {
  return {
    name: d.name,
    type: d.type,
    address: d.address,
    description: d.description && d.description.length > 0 ? d.description : null,
    rentAmount: d.rentAmount,
    securityDeposit: d.securityDeposit,
    numberOfUnits: d.numberOfUnits,
    noticePeriodDays: d.noticePeriodDays,
    rooms: d.rooms ?? null,
    bathrooms: d.bathrooms ?? null,
    balconies: d.balconies ?? null,
    floor: d.floor ?? null,
    totalFloors: d.totalFloors ?? null,
    areaSqft: d.areaSqft ?? null,
    furnishing: d.furnishing,
    hasLobby: d.hasLobby,
    hasParking: d.hasParking,
    hasLift: d.hasLift,
    powerBackup: d.powerBackup,
    carpetAreaSqft: d.carpetAreaSqft ?? null,
    parkingSpots: d.parkingSpots ?? null,
    maintenanceMonthly: d.maintenanceMonthly ?? null,
    facing: d.facing && d.facing.length > 0 ? d.facing : null,
    listedBy: d.listedBy,
    projectName: d.projectName && d.projectName.length > 0 ? d.projectName : null,
    bachelorsAllowed: d.bachelorsAllowed,
    listedPublic: d.listedPublic,
    amenities: d.amenities ? d.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [],
    availability: d.availability,
  };
}

async function ownProperty(landlordId: string, propertyId: string) {
  return prisma.property.findFirst({ where: { id: propertyId, landlordId } });
}

export async function createProperty(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireLandlord();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Landlord-created properties await Master Admin approval.
  const created = await prisma.property.create({
    data: { ...toData(parsed.data), ref: await generatePropertyRef(), landlordId: session.user.id, approved: false },
  });
  await audit({ actorId: session.user.id, action: "property.create", entity: "Property", entityId: created.id });

  // Notify Master Admins to review & approve the new property before it goes live.
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, {
      type: "property",
      title: "New property pending approval",
      body: `${session.user.name ?? "A landlord"} submitted “${created.name}” for review.`,
      link: `/master-admin/properties/${created.id}`,
    });
  }

  revalidatePath("/landlord/properties");
  redirect("/landlord/properties?created=1");
}

export async function updateProperty(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireLandlord();
  const parsed = schema.extend({ id: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...rest } = parsed.data;
  if (!(await ownProperty(session.user.id, id))) return { error: "Property not found." };

  await prisma.property.update({ where: { id }, data: toData(rest) });
  await audit({ actorId: session.user.id, action: "property.update", entity: "Property", entityId: id });
  revalidatePath("/landlord/properties");
  revalidatePath(`/landlord/properties/${id}`);
  return { success: "Changes saved." };
}

export async function uploadPropertyPhoto(formData: FormData) {
  const session = await requireLandlord();
  const propertyId = String(formData.get("propertyId"));
  const back = `/landlord/properties/${propertyId}`;
  if (!(await ownProperty(session.user.id, propertyId))) redirect("/landlord/properties");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  if (file.size > MAX_BYTES) redirect(`${back}?error=toobig`);

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10);
  const key = `properties/${propertyId}/${randomUUID()}${ext}`;
  await saveFile(key, bytes);
  await prisma.document.create({
    data: {
      ownerId: session.user.id,
      propertyId,
      type: "PHOTO",
      storageKey: key,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: bytes.length,
      label: file.name,
    },
  });
  await audit({ actorId: session.user.id, action: "property.fileUpload", entity: "Property", entityId: propertyId });
  revalidatePath(back);
  redirect(`${back}?uploaded=1`);
}

export async function deletePropertyPhoto(formData: FormData) {
  const session = await requireLandlord();
  const docId = String(formData.get("docId"));
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc || doc.ownerId !== session.user.id) redirect("/landlord/properties");
  if (doc.storageKey) await removeFile(doc.storageKey);
  await prisma.document.delete({ where: { id: docId } });
  const back = doc.propertyId ? `/landlord/properties/${doc.propertyId}` : "/landlord/properties";
  revalidatePath(back);
  redirect(back);
}
