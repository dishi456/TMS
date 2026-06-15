"use client";

import { useActionState } from "react";
import { addTenant, type FormState } from "./actions";

export function AddTenantForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addTenant, undefined);
  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Full name</span>
        <input name="fullName" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Email</span>
        <input name="email" type="email" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Temporary password</span>
        <input name="password" type="password" required minLength={8} className={input} placeholder="Min 8 characters" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Phone</span>
          <input name="phone" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Government ID</span>
          <input name="governmentId" className={input} />
        </label>
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add tenant"}
      </button>
    </form>
  );
}
