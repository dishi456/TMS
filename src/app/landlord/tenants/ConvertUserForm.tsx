"use client";

import { useActionState } from "react";
import { convertUserToTenant, type FormState } from "./actions";

export function ConvertUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(convertUserToTenant, undefined);

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">⇪</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Convert a user to a tenant</p>
          <p className="mt-0.5 text-xs text-slate-500">
            If someone signed up as a seeker and is renting from you, enter their email to make them your tenant.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {pending ? "Converting…" : "Make tenant"}
            </button>
          </div>

          {state?.error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}
        </div>
      </div>
    </form>
  );
}
