"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { saveFile, removeFile } from "@/lib/storage";

export type FormState = { error?: string; success?: string } | undefined;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Empty form fields come through as "" — treat those as "not provided" (null).
const optInt = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.number().int().min(0).max(100000).optional(),
);
const checkbox = z.preprocess((v) => v === "true" || v === "on", z.boolean());

const schema = z.object({
  landlordId: z.string().min(1, "Select a landlord."),
  name: z.string().min(2, "Name is too short."),
  type: z.enum(["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL", "OTHER"]),
  address: z.string().min(3, "Enter an address."),
  description: z.string().trim().optional(),
  rentAmount: z.coerce.number().nonnegative("Rent must be ≥ 0."),
  securityDeposit: z.coerce.number().nonnegative().default(0),
  numberOfUnits: z.coerce.number().int().min(1, "At least 1 unit.").default(1),
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

function parseAmenities(s?: string): string[] {
  if (!s) return [];
  return s.split(",").map((a) => a.trim()).filter(Boolean);
}

function toData(d: z.infer<typeof schema>) {
  return {
    landlordId: d.landlordId,
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
    amenities: parseAmenities(d.amenities),
    availability: d.availability,
  };
}

// ---- Create ----
export async function createProperty(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const created = await prisma.property.create({ data: toData(parsed.data) });
  await audit({
    actorId: session.user.id,
    action: "property.create",
    entity: "Property",
    entityId: created.id,
    metadata: { name: created.name },
  });
  revalidatePath("/master-admin/properties");
  redirect("/master-admin/properties?created=1");
}

// ---- Update ----
export async function updateProperty(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = schema.extend({ id: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...rest } = parsed.data;

  await prisma.property.update({ where: { id }, data: toData(rest) });
  await audit({ actorId: session.user.id, action: "property.update", entity: "Property", entityId: id });
  revalidatePath("/master-admin/properties");
  revalidatePath(`/master-admin/properties/${id}`);
  return { success: "Changes saved." };
}

// ---- Approve / unapprove registration ----
export async function setApproved(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const approved = formData.get("approved") === "true";
  await prisma.property.update({ where: { id }, data: { approved } });
  await audit({
    actorId: session.user.id,
    action: approved ? "property.approve" : "property.unapprove",
    entity: "Property",
    entityId: id,
  });
  revalidatePath("/master-admin/properties");
  revalidatePath(`/master-admin/properties/${id}`);
}

// ---- Verify / unverify ownership documents ----
export async function setVerified(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const verified = formData.get("verified") === "true";
  await prisma.property.update({ where: { id }, data: { verified } });
  await audit({
    actorId: session.user.id,
    action: verified ? "property.verifyDocs" : "property.unverifyDocs",
    entity: "Property",
    entityId: id,
  });
  revalidatePath("/master-admin/properties");
  revalidatePath(`/master-admin/properties/${id}`);
}

// ---- Remove (blocked when the property has leases / requests) ----
export async function deleteProperty(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));

  const [leases, maintenance, complaints] = await Promise.all([
    prisma.lease.count({ where: { propertyId: id } }),
    prisma.maintenanceRequest.count({ where: { propertyId: id } }),
    prisma.complaint.count({ where: { propertyId: id } }),
  ]);

  if (leases + maintenance + complaints > 0) {
    redirect("/master-admin/properties?error=has-data");
  }

  await prisma.property.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "property.delete", entity: "Property", entityId: id });
  revalidatePath("/master-admin/properties");
  redirect("/master-admin/properties?deleted=1");
}

// ---- Upload a property file (ownership document or photo) ----
export async function uploadPropertyFile(formData: FormData) {
  const session = await requireAdmin();
  const propertyId = String(formData.get("propertyId"));
  const kind = formData.get("kind") === "PHOTO" ? "PHOTO" : "PROPERTY_PROOF";
  const file = formData.get("file");

  const back = `/master-admin/properties/${propertyId}`;
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  if (file.size > MAX_BYTES) redirect(`${back}?error=toobig`);

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { landlordId: true },
  });
  if (!property) redirect("/master-admin/properties");

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10);
  const key = `properties/${propertyId}/${randomUUID()}${ext}`;
  await saveFile(key, bytes);

  const doc = await prisma.document.create({
    data: {
      ownerId: property.landlordId,
      propertyId,
      type: kind,
      storageKey: key,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: bytes.length,
      label: file.name,
    },
  });
  await audit({
    actorId: session.user.id,
    action: "property.fileUpload",
    entity: "Property",
    entityId: propertyId,
    metadata: { docId: doc.id, kind },
  });

  revalidatePath(back);
  redirect(`${back}?uploaded=1`);
}

// ---- Delete a property file ----
export async function deleteDocument(formData: FormData) {
  const session = await requireAdmin();
  const docId = String(formData.get("docId"));
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) redirect("/master-admin/properties");

  if (doc.storageKey) await removeFile(doc.storageKey);
  await prisma.document.delete({ where: { id: docId } });
  await audit({
    actorId: session.user.id,
    action: "property.fileDelete",
    entity: "Property",
    entityId: doc.propertyId,
    metadata: { docId },
  });

  const back = doc.propertyId ? `/master-admin/properties/${doc.propertyId}` : "/master-admin/properties";
  revalidatePath(back);
  redirect(back);
}
