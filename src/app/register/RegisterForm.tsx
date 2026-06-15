"use client";

import { useActionState, useState } from "react";
import { register, type RegisterState } from "./actions";

export function RegisterForm({ landlords }: { landlords: { id: string; fullName: string }[] }) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(register, undefined);
  const [role, setRole] = useState<"LANDLORD" | "TENANT">("LANDLORD");

  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex rounded-lg border border-slate-300 bg-white p-1 text-sm">
        {(["LANDLORD", "TENANT"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
              role === r ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            {r === "LANDLORD" ? "I'm a Landlord" : "I'm a Tenant"}
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Full name</span>
        <input name="fullName" required className={input} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">Password</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} placeholder="Min 8 characters" />
      </label>

      {role === "TENANT" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Your landlord</span>
          <select name="landlordId" defaultValue="" className={input}>
            <option value="" disabled>
              Select your landlord…
            </option>
            {landlords.map((l) => (
              <option key={l.id} value={l.id}>
                {l.fullName}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">Your landlord will approve your account.</span>
        </label>
      )}

      {role === "LANDLORD" && (
        <p className="text-xs text-slate-400">The Master Admin will review and approve your account.</p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
