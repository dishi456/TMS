"use client";

import { useActionState } from "react";
import { updateProfile, changePassword, type FormState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/profile";

export function ProfileForm({
  defaults,
}: {
  defaults: {
    fullName: string;
    email: string;
    username?: string;
    phone?: string;
    governmentId?: string;
    emergencyContact?: string;
    currency?: string;
    prefCountry?: string;
    prefState?: string;
    prefCity?: string;
  };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><FieldLabel>Full name</FieldLabel><input name="fullName" required defaultValue={defaults.fullName} className={inputClass} /></label>
        <label className="flex flex-col gap-1"><FieldLabel>Username</FieldLabel><input name="username" defaultValue={defaults.username} placeholder="your_handle" className={inputClass} /></label>
        <label className="flex flex-col gap-1"><FieldLabel>Email (read-only)</FieldLabel><input value={defaults.email} disabled className={`${inputClass} bg-slate-50 text-slate-500`} /></label>
        <label className="flex flex-col gap-1"><FieldLabel>Phone</FieldLabel><input name="phone" defaultValue={defaults.phone} className={inputClass} /></label>
        <label className="flex flex-col gap-1"><FieldLabel>Government ID</FieldLabel><input name="governmentId" defaultValue={defaults.governmentId} className={inputClass} /></label>
        <label className="flex flex-col gap-1"><FieldLabel>Emergency contact</FieldLabel><input name="emergencyContact" defaultValue={defaults.emergencyContact} className={inputClass} /></label>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Preferences</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>Currency</FieldLabel>
            <select name="currency" defaultValue={defaults.currency ?? "INR"} className={inputClass}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><FieldLabel>Country</FieldLabel><input name="prefCountry" defaultValue={defaults.prefCountry} placeholder="e.g. India" className={inputClass} /></label>
          <label className="flex flex-col gap-1"><FieldLabel>State / Province</FieldLabel><input name="prefState" defaultValue={defaults.prefState} className={inputClass} /></label>
          <label className="flex flex-col gap-1"><FieldLabel>City</FieldLabel><input name="prefCity" defaultValue={defaults.prefCity} className={inputClass} /></label>
        </div>
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}
      <button type="submit" disabled={pending} className={btn("primary")}>{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePassword, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <label className="flex flex-col gap-1"><FieldLabel>Current password</FieldLabel><input name="currentPassword" type="password" required className={inputClass} /></label>
      <label className="flex flex-col gap-1"><FieldLabel>New password</FieldLabel><input name="newPassword" type="password" required minLength={8} className={inputClass} placeholder="Min 8 characters" /></label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}
      <button type="submit" disabled={pending} className={btn("secondary")}>{pending ? "Updating…" : "Change password"}</button>
    </form>
  );
}
