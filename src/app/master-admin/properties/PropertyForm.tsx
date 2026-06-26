"use client";

import { useActionState, useState } from "react";
import { createProperty, updateProperty, type FormState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";
import { PROPERTY_TYPES, propertyTypeLabel, showsResidentialLayout, TYPE_FIELDS } from "@/lib/property-details";

const AVAIL = ["AVAILABLE", "OCCUPIED", "UNAVAILABLE"] as const;

export type PropertyDefaults = {
  id?: string;
  landlordId?: string;
  name?: string;
  type?: string;
  address?: string;
  description?: string;
  rentAmount?: string;
  securityDeposit?: string;
  numberOfUnits?: string;
  noticePeriodDays?: string;
  rooms?: string;
  bathrooms?: string;
  balconies?: string;
  floor?: string;
  totalFloors?: string;
  areaSqft?: string;
  furnishing?: string;
  hasLobby?: boolean;
  hasParking?: boolean;
  hasLift?: boolean;
  powerBackup?: boolean;
  carpetAreaSqft?: string;
  facing?: string;
  bachelorsAllowed?: boolean;
  maintenanceMonthly?: string;
  projectName?: string;
  parkingSpots?: string;
  listedBy?: string;
  amenities?: string;
  availability?: string;
  listedPublic?: boolean;
  details?: Record<string, unknown>;
};

const FURNISHING = ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"] as const;
const furnishingLabel = (f: string) => f.charAt(0) + f.slice(1).toLowerCase().replace(/_/g, "-");
const FACING = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const LISTED_BY = ["OWNER", "DEALER", "BUILDER"];
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function PropertyForm({
  mode,
  defaults = {},
  landlords,
}: {
  mode: "create" | "edit";
  defaults?: PropertyDefaults;
  landlords: { id: string; fullName: string }[];
}) {
  const action = mode === "create" ? createProperty : updateProperty;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  const [type, setType] = useState<string>(defaults.type ?? "APARTMENT");
  const details = defaults.details ?? {};
  const typeFields = TYPE_FIELDS[type] ?? [];

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>Landlord (owner)</FieldLabel>
          <select name="landlordId" defaultValue={defaults.landlordId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Select a landlord…
            </option>
            {landlords.map((l) => (
              <option key={l.id} value={l.id}>
                {l.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Property name</FieldLabel>
          <input name="name" required defaultValue={defaults.name} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Type</FieldLabel>
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{propertyTypeLabel(t)}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Availability</FieldLabel>
          <select name="availability" defaultValue={defaults.availability ?? "AVAILABLE"} className={inputClass}>
            {AVAIL.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0) + a.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <FieldLabel>Address</FieldLabel>
        <input name="address" required defaultValue={defaults.address} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>Description</FieldLabel>
        <textarea name="description" rows={2} defaultValue={defaults.description} className={inputClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <FieldLabel>Rent ($/mo)</FieldLabel>
          <input name="rentAmount" type="number" min="0" step="1" required defaultValue={defaults.rentAmount} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Deposit ($)</FieldLabel>
          <input name="securityDeposit" type="number" min="0" step="1" defaultValue={defaults.securityDeposit ?? "0"} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Number of units</FieldLabel>
          <input name="numberOfUnits" type="number" min="1" step="1" defaultValue={defaults.numberOfUnits ?? "1"} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Notice period (days)</FieldLabel>
          <input name="noticePeriodDays" type="number" min="0" step="1" defaultValue={defaults.noticePeriodDays ?? "30"} className={inputClass} />
        </label>
      </div>

      {/* Features & layout — residential types only */}
      {showsResidentialLayout(type) && (
      <div className="rounded-lg border border-slate-200 p-3">
        <FieldLabel>Features &amp; layout</FieldLabel>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Bedrooms</span>
            <input name="rooms" type="number" min="0" defaultValue={defaults.rooms} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Washrooms</span>
            <input name="bathrooms" type="number" min="0" defaultValue={defaults.bathrooms} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Balconies</span>
            <input name="balconies" type="number" min="0" defaultValue={defaults.balconies} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Floor</span>
            <input name="floor" type="number" min="0" defaultValue={defaults.floor} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Total floors</span>
            <input name="totalFloors" type="number" min="0" defaultValue={defaults.totalFloors} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Area (sq ft)</span>
            <input name="areaSqft" type="number" min="0" defaultValue={defaults.areaSqft} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-3">
            <span className="text-xs text-slate-500">Furnishing</span>
            <select name="furnishing" defaultValue={defaults.furnishing ?? "UNFURNISHED"} className={inputClass}>
              {FURNISHING.map((f) => <option key={f} value={f}>{furnishingLabel(f)}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-2"><input type="checkbox" name="hasLobby" value="true" defaultChecked={defaults.hasLobby} className="h-4 w-4 rounded border-slate-300" /> Lobby</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="hasParking" value="true" defaultChecked={defaults.hasParking} className="h-4 w-4 rounded border-slate-300" /> Parking</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="hasLift" value="true" defaultChecked={defaults.hasLift} className="h-4 w-4 rounded border-slate-300" /> Lift / Elevator</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="powerBackup" value="true" defaultChecked={defaults.powerBackup} className="h-4 w-4 rounded border-slate-300" /> Power backup</label>
        </div>
      </div>
      )}

      {/* Type-specific details — dynamic per property type, keyed so fields
          remount with the right defaults when the type changes. */}
      {typeFields.length > 0 && (
        <div key={type} className="rounded-lg border border-slate-200 p-3">
          <FieldLabel>{propertyTypeLabel(type)} details</FieldLabel>
          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            {typeFields.filter((f) => f.kind !== "checkbox").map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">{f.label}</span>
                {f.kind === "select" ? (
                  <select name={`detail__${f.key}`} defaultValue={(details[f.key] as string) ?? ""} className={inputClass}>
                    <option value="">Not specified</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input name={`detail__${f.key}`} type={f.kind === "number" ? "number" : "text"} defaultValue={(details[f.key] as string | number | undefined) ?? ""} placeholder={f.kind === "text" ? f.placeholder : undefined} className={inputClass} />
                )}
              </label>
            ))}
          </div>
          {typeFields.some((f) => f.kind === "checkbox") && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              {typeFields.filter((f) => f.kind === "checkbox").map((f) => (
                <label key={f.key} className="flex items-center gap-2">
                  <input type="checkbox" name={`detail__${f.key}`} value="true" defaultChecked={!!details[f.key]} className="h-4 w-4 rounded border-slate-300" /> {f.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Listing details — OLX-style extras */}
      <div className="rounded-lg border border-slate-200 p-3">
        <FieldLabel>Listing details</FieldLabel>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Carpet area (sq ft)</span>
            <input name="carpetAreaSqft" type="number" min="0" defaultValue={defaults.carpetAreaSqft} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Car parking (spots)</span>
            <input name="parkingSpots" type="number" min="0" defaultValue={defaults.parkingSpots} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Maintenance ($/mo)</span>
            <input name="maintenanceMonthly" type="number" min="0" defaultValue={defaults.maintenanceMonthly} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Facing</span>
            <select name="facing" defaultValue={defaults.facing ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              {FACING.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Listed by</span>
            <select name="listedBy" defaultValue={defaults.listedBy ?? "OWNER"} className={inputClass}>
              {LISTED_BY.map((l) => <option key={l} value={l}>{titleCase(l)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Project / society name</span>
            <input name="projectName" defaultValue={defaults.projectName} className={inputClass} />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="bachelorsAllowed" value="true" defaultChecked={defaults.bachelorsAllowed ?? true} className="h-4 w-4 rounded border-slate-300" /> Bachelors allowed
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <FieldLabel>Amenities (comma-separated)</FieldLabel>
        <input name="amenities" defaultValue={defaults.amenities} placeholder="Parking, Lift, Power Backup" className={inputClass} />
      </label>

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input type="checkbox" name="listedPublic" value="true" defaultChecked={defaults.listedPublic ?? true} className="h-4 w-4 rounded border-slate-300" />
          🌐 Show on the public listings page
        </label>
        <p className="mt-1 text-xs text-slate-500">Requires approval too. Untick to keep this property private.</p>
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <div className="pt-1">
        <button type="submit" disabled={pending} className={btn("primary")}>
          {pending ? "Saving…" : mode === "create" ? "Add property" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
