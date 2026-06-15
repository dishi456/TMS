"use client";

import { useActionState } from "react";
import { submitComplaint, type FormState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";

export function ComplaintForm({ properties }: { properties: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(submitComplaint, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {properties.length > 0 && (
        <label className="flex flex-col gap-1">
          <FieldLabel>Property (optional)</FieldLabel>
          <select name="propertyId" defaultValue={properties.length === 1 ? properties[0].id : ""} className={inputClass}>
            <option value="">— General —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1"><FieldLabel>Subject</FieldLabel><input name="subject" required className={inputClass} /></label>
      <label className="flex flex-col gap-1"><FieldLabel>Description</FieldLabel><textarea name="description" rows={3} required className={inputClass} /></label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={btn("primary")}>{pending ? "Submitting…" : "Submit complaint"}</button>
    </form>
  );
}
