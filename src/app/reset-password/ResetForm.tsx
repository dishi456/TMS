"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);
  const input = "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-600">New password</span>
        <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={input} placeholder="Min 8 characters" />
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
