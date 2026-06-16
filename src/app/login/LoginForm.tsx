"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);
  // Controlled so values survive React 19's form-reset after the phase-1 submit.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const otpStep = state?.step === "otp";
  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  function resend() {
    setCode("");
    // Submit with an empty code → server re-checks password and re-sends a code.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* Email + password stay mounted (hidden in phase 2) and carry their
          values via state so the OTP submit includes them. */}
      <label className={`flex flex-col gap-1 text-sm ${otpStep ? "hidden" : ""}`}>
        <span className="text-slate-600">Email</span>
        <input name="email" type="email" required={!otpStep} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@example.com" />
      </label>

      <label className={`flex flex-col gap-1 text-sm ${otpStep ? "hidden" : ""}`}>
        <span className="text-slate-600">Password</span>
        <input name="password" type="password" required={!otpStep} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="••••••••" />
      </label>

      {otpStep && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-600">
            Enter the 6-digit code we emailed to <span className="font-medium text-slate-800">{state?.email}</span>.
          </p>
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoFocus
            placeholder="••••••"
            className={`${input} text-center text-lg font-semibold tracking-[0.5em]`}
          />
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || (otpStep && code.length !== 6)}
        className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? (otpStep ? "Verifying…" : "Sending code…") : otpStep ? "Verify & sign in" : "Sign in"}
      </button>

      {otpStep && (
        <button type="button" onClick={resend} disabled={pending} className="text-center text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50">
          Resend code
        </button>
      )}
    </form>
  );
}
