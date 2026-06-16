"use client";

import { useActionState } from "react";
import { requestVisit, type VisitState } from "../actions";

export function VisitForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState<VisitState, FormData>(requestVisit, undefined);
  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Visit requested! The landlord will confirm a time with you shortly.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Full name</span><input name="fullName" required className={input} /></label>
      <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Email</span><input name="email" type="email" required className={input} /></label>
      <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Phone</span><input name="phone" className={input} /></label>
      <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Preferred date &amp; time</span><input name="preferredAt" type="datetime-local" required className={input} /></label>
      <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Message</span><textarea name="message" rows={2} className={input} placeholder="Anything the landlord should know?" /></label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg border border-blue-600 px-4 py-2.5 font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-60">
        {pending ? "Requesting…" : "Schedule a visit"}
      </button>
    </form>
  );
}
