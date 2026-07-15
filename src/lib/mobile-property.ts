import { z } from "zod";
import { toStrArr } from "@/lib/json";

// Shared property write schema for the mobile API (JSON body; numbers/booleans native).
export const propertyWriteSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL", "LAND", "STUDENT_HOUSING", "OTHER"]),
  address: z.string().min(3),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  // Type-specific fields from the dynamic form (free-form key/value map).
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  description: z.string().optional(),
  rentAmount: z.coerce.number().nonnegative(),
  securityDeposit: z.coerce.number().nonnegative().default(0),
  numberOfUnits: z.coerce.number().int().min(1).default(1),
  noticePeriodDays: z.coerce.number().int().min(0).max(365).default(30),
  rooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  balconies: z.coerce.number().int().min(0).optional(),
  floor: z.coerce.number().int().optional(),
  totalFloors: z.coerce.number().int().optional(),
  areaSqft: z.coerce.number().int().min(0).optional(),
  carpetAreaSqft: z.coerce.number().int().min(0).optional(),
  parkingSpots: z.coerce.number().int().min(0).optional(),
  maintenanceMonthly: z.coerce.number().min(0).optional(),
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"]).default("UNFURNISHED"),
  hasLobby: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  hasLift: z.boolean().default(false),
  powerBackup: z.boolean().default(false),
  bachelorsAllowed: z.boolean().default(true),
  listedPublic: z.boolean().default(true),
  facing: z.string().optional(),
  listedBy: z.enum(["OWNER", "DEALER", "BUILDER"]).default("OWNER"),
  projectName: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  availability: z.enum(["AVAILABLE", "OCCUPIED", "UNAVAILABLE"]).default("AVAILABLE"),
});

export function toPropertyData(d: z.infer<typeof propertyWriteSchema>) {
  return {
    name: d.name, type: d.type, address: d.address,
    country: d.country || null, state: d.state || null, city: d.city || null, postalCode: d.postalCode || null,
    latitude: d.latitude ?? null, longitude: d.longitude ?? null,
    details: d.details ?? undefined,
    description: d.description || null,
    rentAmount: d.rentAmount, securityDeposit: d.securityDeposit,
    numberOfUnits: d.numberOfUnits, noticePeriodDays: d.noticePeriodDays,
    rooms: d.rooms ?? null, bathrooms: d.bathrooms ?? null, balconies: d.balconies ?? null,
    floor: d.floor ?? null, totalFloors: d.totalFloors ?? null, areaSqft: d.areaSqft ?? null,
    carpetAreaSqft: d.carpetAreaSqft ?? null, parkingSpots: d.parkingSpots ?? null,
    maintenanceMonthly: d.maintenanceMonthly ?? null,
    furnishing: d.furnishing, hasLobby: d.hasLobby, hasParking: d.hasParking,
    hasLift: d.hasLift, powerBackup: d.powerBackup, bachelorsAllowed: d.bachelorsAllowed,
    listedPublic: d.listedPublic, facing: d.facing || null, listedBy: d.listedBy,
    projectName: d.projectName || null, amenities: d.amenities, availability: d.availability,
  };
}

type PropertyRow = {
  id: string; ref: string | null; name: string; address: string; type: string;
  rentAmount: { toString(): string }; securityDeposit?: { toString(): string };
  rooms: number | null; bathrooms: number | null; areaSqft: number | null;
  furnishing: string; availability: string; verified: boolean; approved: boolean;
  listedPublic: boolean; amenities: unknown; createdAt: Date;
  documents?: { id: string }[];
};

export function serializeCard(p: PropertyRow) {
  return {
    id: p.id, ref: p.ref, name: p.name, address: p.address, type: p.type,
    rent: Number(p.rentAmount), rooms: p.rooms, bathrooms: p.bathrooms, areaSqft: p.areaSqft,
    furnishing: p.furnishing, amenities: toStrArr(p.amenities),
    availability: p.availability, approved: p.approved, verified: p.verified, listedPublic: p.listedPublic,
    photo: p.documents?.[0] ? `/api/files/${p.documents[0].id}` : null,
    createdAt: p.createdAt,
  };
}
