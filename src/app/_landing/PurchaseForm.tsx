"use client";

import { useActionState, useEffect, useState } from "react";
import { submitInquiry, type InquiryState } from "./actions";

type Profile = "LANDLORD" | "AGENCY" | "ENTERPRISE";
type Plan = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

const PROFILES: { value: Profile; label: string }[] = [
  { value: "LANDLORD", label: "Individual landlord" },
  { value: "AGENCY", label: "Property agency" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const PLANS: { value: Plan; label: string }[] = [
  { value: "STARTER", label: "Starter" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const initialState: InquiryState = { ok: false };

export function PurchaseForm() {
  const [state, formAction, pending] = useActionState(submitInquiry, initialState);
  const [profile, setProfile] = useState<Profile>("LANDLORD");
  const [plan, setPlan] = useState<Plan>("PROFESSIONAL");

  // Let the pricing cards pre-select a plan when their CTA is clicked.
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-plan]"));
    const handlers: Array<() => void> = [];
    for (const node of nodes) {
      const p = node.dataset.plan as Plan | undefined;
      if (!p) continue;
      const h = () => setPlan(p);
      node.addEventListener("click", h);
      handlers.push(() => node.removeEventListener("click", h));
    }
    return () => handlers.forEach((off) => off());
  }, []);

  if (state.ok) {
    return (
      <div className="animate-fade-up rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center sm:p-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg shadow-emerald-500/30">
          ✓
        </div>
        <h3 className="text-xl font-bold text-slate-900">Request received!</h3>
        <p className="mt-2 text-sm text-slate-600">
          Thanks for your interest in TMS. Our team will reach out within one
          business day to set up your workspace and walk you through onboarding.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Explore the demo →
        </a>
      </div>
    );
  }

  const err = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="profile" value={profile} />
      <input type="hidden" name="plan" value={plan} />

      {/* Profile segmented control */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">I am a…</label>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
          {PROFILES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setProfile(p.value)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:text-sm ${
                profile === p.value
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={err?.name}>
          <input name="name" required placeholder="Jane Cooper" className={input} />
        </Field>
        <Field label="Work email" error={err?.email}>
          <input name="email" type="email" required placeholder="jane@acme.com" className={input} />
        </Field>
        <Field label="Phone" hint="optional">
          <input name="phone" placeholder="+91 98765 43210" className={input} />
        </Field>
        <Field label="Company / organization" hint="optional">
          <input name="organization" placeholder="Acme Estates" className={input} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Plan select */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Plan</label>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
            {PLANS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlan(p.value)}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                  plan === p.value
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="How many units?" hint="optional">
          <input name="units" placeholder="e.g. 25" className={input} />
        </Field>
      </div>

      <Field label="Anything else?" hint="optional">
        <textarea
          name="message"
          rows={3}
          placeholder="Tell us about your portfolio or questions…"
          className={`${input} resize-none`}
        />
      </Field>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="shine group mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/40 disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request access"}
        {!pending && <span className="transition-transform group-hover:translate-x-1">→</span>}
      </button>

      <p className="text-center text-xs text-slate-400">
        No credit card required · We&apos;ll reply within one business day
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}
      </span>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}
