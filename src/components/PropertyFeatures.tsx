import { formatNumber } from "@/lib/format";
import { toStrArr } from "@/lib/json";

const FURNISHING_LABEL: Record<string, string> = {
  UNFURNISHED: "Unfurnished",
  SEMI_FURNISHED: "Semi-furnished",
  FURNISHED: "Furnished",
};

export type PropertyFeatureData = {
  rooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  areaSqft?: number | null;
  furnishing?: string | null;
  hasLobby?: boolean;
  hasParking?: boolean;
  hasLift?: boolean;
  powerBackup?: boolean;
  amenities?: unknown; // Prisma Json (former String[]) — coerced via toStrArr
};

/** Read-only property layout + facilities — shown to landlord, admin and tenant alike. */
export function PropertyFeatures({ p }: { p: PropertyFeatureData }) {
  const facts: { label: string; value: string }[] = [];
  if (p.rooms != null) facts.push({ label: "Bedrooms", value: formatNumber(p.rooms) });
  if (p.bathrooms != null) facts.push({ label: "Washrooms", value: formatNumber(p.bathrooms) });
  if (p.balconies != null) facts.push({ label: "Balconies", value: formatNumber(p.balconies) });
  if (p.floor != null)
    facts.push({ label: "Floor", value: p.totalFloors != null ? `${p.floor} of ${p.totalFloors}` : String(p.floor) });
  if (p.areaSqft != null) facts.push({ label: "Area", value: `${formatNumber(p.areaSqft)} sq ft` });
  if (p.furnishing) facts.push({ label: "Furnishing", value: FURNISHING_LABEL[p.furnishing] ?? p.furnishing });

  const facilities: string[] = [];
  if (p.hasLobby) facilities.push("Lobby");
  if (p.hasParking) facilities.push("Parking");
  if (p.hasLift) facilities.push("Lift / Elevator");
  if (p.powerBackup) facilities.push("Power backup");
  const extras = toStrArr(p.amenities);

  if (facts.length === 0 && facilities.length === 0 && extras.length === 0) {
    return <p className="text-sm text-slate-400">No additional details provided yet.</p>;
  }

  return (
    <div className="space-y-4">
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <dt className="text-xs text-slate-400">{f.label}</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(facilities.length > 0 || extras.length > 0) && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">Facilities &amp; amenities</p>
          <div className="flex flex-wrap gap-2">
            {facilities.map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                ✓ {f}
              </span>
            ))}
            {extras.map((a) => (
              <span key={a} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
