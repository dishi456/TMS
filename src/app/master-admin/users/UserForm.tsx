"use client";

import { useActionState, useState } from "react";
import { createUser, updateUser, type FormState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";

export type UserDefaults = {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: "LANDLORD" | "TENANT" | "USER";
  governmentId?: string;
  emergencyContact?: string;
};

const ROLE_LABEL: Record<string, string> = { LANDLORD: "Landlord", TENANT: "Tenant", USER: "Seeker" };

export function UserForm({
  mode,
  defaults = {},
}: {
  mode: "create" | "edit";
  defaults?: UserDefaults;
}) {
  const action = mode === "create" ? createUser : updateUser;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  const [role, setRole] = useState<"LANDLORD" | "TENANT" | "USER">(defaults.role ?? "LANDLORD");

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>Full name</FieldLabel>
          <input name="fullName" required defaultValue={defaults.fullName} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Email</FieldLabel>
          <input name="email" type="email" required defaultValue={defaults.email} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Phone</FieldLabel>
          <input name="phone" defaultValue={defaults.phone} className={inputClass} placeholder="+1…" />
        </label>

        <label className="flex flex-col gap-1">
          <FieldLabel>Role</FieldLabel>
          {mode === "create" ? (
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "LANDLORD" | "TENANT")}
              className={inputClass}
            >
              <option value="LANDLORD">Landlord</option>
              <option value="TENANT">Tenant</option>
            </select>
          ) : (
            <>
              <input type="hidden" name="role" value={defaults.role} />
              <input
                value={ROLE_LABEL[defaults.role ?? "LANDLORD"] ?? defaults.role}
                disabled
                className={`${inputClass} bg-slate-50 text-slate-500`}
              />
            </>
          )}
        </label>
      </div>

      {/* Tenant-specific identity fields */}
      {role === "TENANT" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>Government ID</FieldLabel>
            <input name="governmentId" defaultValue={defaults.governmentId} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Emergency contact</FieldLabel>
            <input
              name="emergencyContact"
              defaultValue={defaults.emergencyContact}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <label className="flex max-w-sm flex-col gap-1">
        <FieldLabel>{mode === "create" ? "Password" : "New password"}</FieldLabel>
        <input
          name="password"
          type="password"
          required={mode === "create"}
          minLength={8}
          className={inputClass}
          placeholder={mode === "edit" ? "Leave blank to keep current" : "Min 8 characters"}
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending} className={btn("primary")}>
          {pending ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
