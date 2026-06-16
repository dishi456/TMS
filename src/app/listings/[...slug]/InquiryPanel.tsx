"use client";

import { useState } from "react";
import { ApplyForm } from "./ApplyForm";
import { VisitForm } from "./VisitForm";
import { OwnerChat } from "./OwnerChat";

type Mode = "apply" | "visit" | "chat";

export function InquiryPanel({ propertyId, available, loggedIn = false }: { propertyId: string; available: boolean; loggedIn?: boolean }) {
  const [mode, setMode] = useState<Mode>(available ? "apply" : "visit");

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Interested in this property?</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Radio toggle — chat only offered while the property is available */}
        <div role="radiogroup" className={`mb-4 grid gap-2 ${available ? "grid-cols-3" : "grid-cols-2"}`}>
          <Radio label="🏠 Apply" checked={mode === "apply"} disabled={!available} onSelect={() => available && setMode("apply")} />
          <Radio label="📅 Visit" checked={mode === "visit"} onSelect={() => setMode("visit")} />
          {available && <Radio label="💬 Chat" checked={mode === "chat"} onSelect={() => setMode("chat")} />}
        </div>

        {mode === "apply" ? (
          available ? (
            <ApplyForm propertyId={propertyId} />
          ) : (
            <p className="text-sm text-slate-500">This property is currently occupied — you can still schedule a visit for when it&apos;s available.</p>
          )
        ) : mode === "visit" ? (
          <VisitForm propertyId={propertyId} />
        ) : (
          <OwnerChat propertyId={propertyId} loggedIn={loggedIn} />
        )}
      </div>
    </div>
  );
}

function Radio({
  label,
  checked,
  disabled,
  onSelect,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
          : checked
            ? "cursor-pointer border-blue-500 bg-blue-50 text-blue-700"
            : "cursor-pointer border-slate-300 bg-white text-slate-600 hover:border-blue-300"
      }`}
    >
      <input
        type="radio"
        name="inquiryMode"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="h-4 w-4 accent-blue-600"
      />
      {label}
    </label>
  );
}
