"use client";

import { useActionState } from "react";
import { createLease, updateLease, type FormState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";

const STATUSES = ["DRAFT", "ACTIVE", "RENEWED", "TERMINATED", "EXPIRED", "COMPLETED"] as const;

export type LeaseDefaults = {
  id?: string;
  propertyId?: string;
  tenantId?: string;
  startDate?: string; // yyyy-mm-dd
  endDate?: string;
  monthlyRent?: string;
  securityDeposit?: string;
  maintenanceFee?: string;
  noticePeriodDays?: string;
  terms?: string;
  status?: string;
};

export function LeaseForm({
  mode,
  defaults = {},
  properties,
  tenants,
}: {
  mode: "create" | "edit";
  defaults?: LeaseDefaults;
  properties: { id: string; name: string; landlordName: string }[];
  tenants: { id: string; fullName: string }[];
}) {
  const action = mode === "create" ? createLease : updateLease;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>Property</FieldLabel>
          <select name="propertyId" defaultValue={defaults.propertyId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Select a property…
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.landlordName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Tenant</FieldLabel>
          <select name="tenantId" defaultValue={defaults.tenantId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Select a tenant…
            </option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Start date</FieldLabel>
          <input name="startDate" type="date" required defaultValue={defaults.startDate} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>End date</FieldLabel>
          <input name="endDate" type="date" required defaultValue={defaults.endDate} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Monthly rent ($)</FieldLabel>
          <input name="monthlyRent" type="number" min="0" step="1" required defaultValue={defaults.monthlyRent} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Security deposit ($)</FieldLabel>
          <input name="securityDeposit" type="number" min="0" step="1" defaultValue={defaults.securityDeposit ?? "0"} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Maintenance fee ($/mo)</FieldLabel>
          <input name="maintenanceFee" type="number" min="0" defaultValue={defaults.maintenanceFee} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Notice period (days)</FieldLabel>
          <input name="noticePeriodDays" type="number" min="0" defaultValue={defaults.noticePeriodDays ?? "30"} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Status</FieldLabel>
          <select name="status" defaultValue={defaults.status ?? "DRAFT"} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === "edit" && defaults.status && defaults.status !== "DRAFT" ? (
        <label className="flex flex-col gap-1">
          <FieldLabel>Terms &amp; conditions</FieldLabel>
          <textarea rows={3} disabled defaultValue={defaults.terms} className={inputClass + " bg-slate-50 text-slate-500"} />
          <span className="text-xs text-slate-400">Terms are locked once the agreement is active.</span>
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <FieldLabel>Terms &amp; conditions</FieldLabel>
          <textarea name="terms" rows={3} defaultValue={defaults.terms} className={inputClass} />
        </label>
      )}

      {mode === "create" && (
        <label className="flex flex-col gap-1">
          <FieldLabel>Signed agreement (optional — upload if signed offline)</FieldLabel>
          <input
            type="file"
            name="agreement"
            accept="image/*,application/pdf"
            className="text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700"
          />
          <span className="text-xs text-slate-400">PDF or image, up to 8 MB. You can also add it later from the lease page.</span>
        </label>
      )}

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <div className="pt-1">
        <button type="submit" disabled={pending} className={btn("primary")}>
          {pending ? "Saving…" : mode === "create" ? "Create lease" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
