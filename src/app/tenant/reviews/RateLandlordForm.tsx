"use client";

import { useActionState } from "react";
import { rateLandlord, type FormState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";

const CRITERIA = [
  { name: "propertyQuality", label: "Property Quality" },
  { name: "maintenanceSupport", label: "Maintenance Support" },
  { name: "communication", label: "Communication" },
  { name: "transparency", label: "Transparency" },
  { name: "overall", label: "Overall Experience" },
];

export function RateLandlordForm({
  leaseId,
  defaults,
}: {
  leaseId: string;
  defaults?: { stars?: number; feedback?: string; recommend?: boolean; criteria?: Record<string, number> };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(rateLandlord, undefined);
  const stars = [1, 2, 3, 4, 5];
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="leaseId" value={leaseId} />
      <label className="flex flex-col gap-1">
        <FieldLabel>Overall star rating</FieldLabel>
        <select name="stars" defaultValue={defaults?.stars ?? 5} className={inputClass + " max-w-[8rem]"}>
          {stars.map((s) => <option key={s} value={s}>{s} ★</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {CRITERIA.map((c) => (
          <label key={c.name} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-sm text-slate-600">{c.label}</span>
            <select name={c.name} defaultValue={defaults?.criteria?.[c.name] ?? 5} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
              {stars.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <FieldLabel>Written feedback</FieldLabel>
        <textarea name="feedback" rows={3} defaultValue={defaults?.feedback} className={inputClass} placeholder="How was your experience?" />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="recommend" defaultChecked={defaults?.recommend} className="h-4 w-4" />
        I would recommend this landlord to other tenants
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={btn("primary")}>{pending ? "Saving…" : "Submit rating"}</button>
    </form>
  );
}
