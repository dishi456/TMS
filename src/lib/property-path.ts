// Canonical public URL for a property:
//   /listings/{category}/{type}/{city}/{state}/{ref}
// e.g. /listings/residential/apartment/boston/ma/204517
// Pure + dependency-free so it works in both server and client components.

export type PathInput = {
  id: string;
  ref?: string | null;
  type: string; // PropertyType enum value
  address: string;
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "na";
}

// "123 Main St, Brooklyn, NY" → { city: "brooklyn", state: "ny" }.
// Falls back gracefully when the address has fewer comma-separated parts.
export function cityState(address: string): { city: string; state: string } {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  const state = parts.length >= 1 ? parts[parts.length - 1] : address;
  const city = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] ?? address);
  return { city: slugify(city), state: slugify(state) };
}

export function propertyCategory(type: string): "commercial" | "residential" {
  return type.toUpperCase() === "COMMERCIAL" ? "commercial" : "residential";
}

export function propertyPath(p: PathInput): string {
  const idSeg = p.ref || p.id;
  const { city, state } = cityState(p.address);
  return `/listings/${propertyCategory(p.type)}/${slugify(p.type)}/${city}/${state}/${idSeg}`;
}
