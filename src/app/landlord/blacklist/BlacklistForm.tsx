"use client";

import { useActionState } from "react";
import { addToBlacklist, type BlacklistState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";

export function BlacklistForm({ candidates }: { candidates: { id: string; name: string; email: string }[] }) {
  const [state, formAction, pending] = useActionState<BlacklistState, FormData>(addToBlacklist, undefined);

  if (candidates.length === 0) {
    return <p className="text-sm text-slate-400">No tenants to blacklist yet. Tenants you manage or have a lease with will appear here.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex flex-col gap-1">
        <FieldLabel>Tenant</FieldLabel>
        <select name="tenantId" required className={inputClass} defaultValue="">
          <option value="" disabled>Choose a tenant…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <FieldLabel>Reason</FieldLabel>
        <textarea name="reason" required rows={3} placeholder="e.g. Repeated late rent, property damage…" className={inputClass} />
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}
      <button type="submit" disabled={pending} className={btn("danger")}>{pending ? "Saving…" : "Add to blacklist"}</button>
    </form>
  );
}
