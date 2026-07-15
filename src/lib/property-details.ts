// Type-specific property fields. The landlord "Add property" form renders only
// the block for the chosen type, and the values are stored in Property.details
// (a JSON map), matching the mobile dynamic form.

export const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL", "LAND", "STUDENT_HOUSING", "OTHER"] as const;
export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number];

export function propertyTypeLabel(t: string): string {
  return t
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Residential types get the bedrooms / bathrooms / furnishing block; LAND and
// COMMERCIAL don't.
export const RESIDENTIAL_TYPES: string[] = ["APARTMENT", "HOUSE", "ROOM", "STUDENT_HOUSING"];
export function showsResidentialLayout(type: string): boolean {
  return RESIDENTIAL_TYPES.includes(type);
}

export type DetailField =
  | { key: string; label: string; kind: "text"; placeholder?: string }
  | { key: string; label: string; kind: "number"; placeholder?: string }
  | { key: string; label: string; kind: "select"; options: string[] }
  | { key: string; label: string; kind: "checkbox" };

export const TYPE_FIELDS: Record<string, DetailField[]> = {
  APARTMENT: [
    { key: "configuration", label: "Configuration", kind: "select", options: ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"] },
    { key: "ageYears", label: "Age of property (years)", kind: "number" },
    { key: "gatedSecurity", label: "Gated security", kind: "checkbox" },
  ],
  HOUSE: [
    { key: "configuration", label: "Configuration", kind: "select", options: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa / Bungalow"] },
    { key: "plotAreaSqft", label: "Plot area (sq ft)", kind: "number" },
    { key: "ageYears", label: "Age of property (years)", kind: "number" },
    { key: "cornerProperty", label: "Corner property", kind: "checkbox" },
  ],
  ROOM: [
    { key: "roomType", label: "Room type", kind: "select", options: ["Private", "Shared"] },
    { key: "attachedBathroom", label: "Attached bathroom", kind: "checkbox" },
    { key: "mealsIncluded", label: "Meals included", kind: "checkbox" },
  ],
  COMMERCIAL: [
    { key: "commercialType", label: "Property type", kind: "select", options: ["Office", "Shop", "Showroom", "Warehouse", "Industrial", "Other"] },
    { key: "washroom", label: "Washroom", kind: "select", options: ["Private", "Shared", "None"] },
    { key: "cabins", label: "Cabins / rooms", kind: "number" },
    { key: "suitableFor", label: "Suitable for", kind: "text", placeholder: "e.g. Retail, Clinic, Office" },
  ],
  LAND: [
    { key: "landUse", label: "Land use", kind: "select", options: ["Residential", "Commercial", "Agricultural", "Industrial"] },
    { key: "plotAreaSqft", label: "Plot area (sq ft)", kind: "number" },
    { key: "plotLengthFt", label: "Plot length (ft)", kind: "number" },
    { key: "plotWidthFt", label: "Plot width (ft)", kind: "number" },
    { key: "openSides", label: "Open sides", kind: "number" },
    { key: "boundaryWall", label: "Boundary wall", kind: "checkbox" },
  ],
  STUDENT_HOUSING: [
    { key: "occupancyType", label: "Occupancy", kind: "select", options: ["Single", "Double", "Triple", "Dormitory"] },
    { key: "genderPreference", label: "Gender preference", kind: "select", options: ["Any", "Male", "Female"] },
    { key: "distanceToCampusKm", label: "Distance to campus (km)", kind: "number" },
    { key: "curfew", label: "Curfew / rules", kind: "text", placeholder: "e.g. 11 PM gate close" },
    { key: "mealsIncluded", label: "Meals included", kind: "checkbox" },
  ],
  OTHER: [],
};

export type DetailValue = string | number | boolean;

// Pull the type-specific values out of a submitted form into a clean map.
export function extractDetails(formData: FormData, type: string): Record<string, DetailValue> {
  const fields = TYPE_FIELDS[type] ?? [];
  const out: Record<string, DetailValue> = {};
  for (const f of fields) {
    const raw = formData.get(`detail__${f.key}`);
    if (f.kind === "checkbox") {
      out[f.key] = raw === "true" || raw === "on";
      continue;
    }
    if (raw == null || String(raw).trim() === "") continue;
    if (f.kind === "number") {
      const n = Number(raw);
      if (!Number.isNaN(n)) out[f.key] = n;
      continue;
    }
    out[f.key] = String(raw);
  }
  return out;
}

// Human-readable (label, value) pairs for displaying a property's details.
export function describeDetails(type: string, details: unknown): { label: string; value: string }[] {
  if (!details || typeof details !== "object") return [];
  const map = details as Record<string, unknown>;
  const fields = TYPE_FIELDS[type] ?? [];
  const out: { label: string; value: string }[] = [];
  for (const f of fields) {
    const v = map[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (f.kind === "checkbox") {
      if (v) out.push({ label: f.label, value: "Yes" });
    } else {
      out.push({ label: f.label, value: String(v) });
    }
  }
  return out;
}
