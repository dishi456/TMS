"use client";

import { useEffect, useState, useTransition } from "react";
import { register } from "./actions";

type Role = "USER" | "LANDLORD";

export function RegisterForm() {
  const [role, setRole] = useState<Role>("USER");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [values, setValues] = useState<{ fullName: string; email: string; password: string } | null>(null);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  useEffect(() => {
    if (resendIn <= 0) return;
    const i = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, [resendIn]);

  // Step 1 → validate locally, email a code.
  async function submitDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const v = {
      fullName: String(fd.get("fullName") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
    };
    if (v.password.length < 8) return setError("Password must be at least 8 characters.");

    setSendingOtp(true);
    try {
      const r = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v.email, purpose: "register" }),
      });
      if (!r.ok) return setError(await r.text());
      setValues(v);
      setStep("otp");
      setCode("");
      setResendIn(30);
    } catch {
      setError("Couldn't send the code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function resendOtp() {
    if (!values || resendIn > 0) return;
    setError(null);
    const r = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, purpose: "register" }),
    });
    if (!r.ok) setError(await r.text());
    else setResendIn(30);
  }

  // Step 2 → verify code, then create the account.
  async function verifyAndRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values) return;
    setError(null);
    const v = await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, code, purpose: "register" }),
    });
    if (!v.ok) return setError(await v.text());
    const { verifyToken } = await v.json();

    const fd = new FormData();
    fd.set("fullName", values.fullName);
    fd.set("email", values.email);
    fd.set("password", values.password);
    fd.set("role", role);
    fd.set("otpToken", verifyToken);

    startTransition(async () => {
      const res = await register(undefined, fd); // redirects on success
      if (res?.error) setError(res.error);
    });
  }

  // ---- OTP step ----
  if (step === "otp" && values) {
    return (
      <form onSubmit={verifyAndRegister} className="flex flex-col gap-4">
        <button type="button" onClick={() => { setStep("form"); setError(null); }} className="self-start text-xs text-slate-400 hover:text-slate-600">← Edit details</button>
        <p className="text-sm text-slate-600">Enter the 6-digit code we emailed to <span className="font-medium text-slate-800">{values.email}</span>.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          placeholder="••••••"
          className={`${input} text-center text-lg font-semibold tracking-[0.5em]`}
        />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending || code.length !== 6} className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
          {pending ? "Creating account…" : "Verify & create account"}
        </button>
        <button type="button" onClick={resendOtp} disabled={resendIn > 0} className="text-center text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50">
          {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
        </button>
      </form>
    );
  }

  // ---- Details step ----
  return (
    <form onSubmit={submitDetails} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {([
          { r: "USER" as const, t: "Looking for a home", d: "Browse & chat with owners" },
          { r: "LANDLORD" as const, t: "I'm a Landlord", d: "List & manage properties" },
        ]).map(({ r, t, d }) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-xl border p-3 text-left transition-colors ${role === r ? "border-blue-600 bg-blue-50 ring-1 ring-blue-200" : "border-slate-300 hover:border-blue-300"}`}
          >
            <p className={`text-sm font-semibold ${role === r ? "text-blue-700" : "text-slate-800"}`}>{t}</p>
            <p className="mt-0.5 text-xs text-slate-500">{d}</p>
          </button>
        ))}
      </div>

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

      <p className="text-xs text-slate-400">
        {role === "USER"
          ? "Start browsing right away. When you rent a place, your landlord can upgrade you to a full tenant account."
          : "The Master Admin will review and approve your landlord account."}
      </p>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={sendingOtp} className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
        {sendingOtp ? "Sending code…" : "Continue"}
      </button>
    </form>
  );
}
