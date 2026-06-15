"use client";

import { useActionState, useState } from "react";
import { submitMaintenance, type FormState } from "./actions";
import { FieldLabel, inputClass, btn } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";

export function MaintenanceForm({ properties }: { properties: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(submitMaintenance, undefined);
  const [images, setImages] = useState<{ id: string; url: string; fileName: string }[]>([]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex flex-col gap-1">
        <FieldLabel>Property</FieldLabel>
        <select name="propertyId" defaultValue={properties.length === 1 ? properties[0].id : ""} required className={inputClass}>
          {properties.length !== 1 && <option value="" disabled>Select your property…</option>}
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <FieldLabel>Title</FieldLabel>
        <input name="title" required className={inputClass} placeholder="e.g. Leaking kitchen tap" />
      </label>
      <label className="flex flex-col gap-1">
        <FieldLabel>Description</FieldLabel>
        <textarea name="description" rows={3} required className={inputClass} placeholder="Describe the issue…" />
      </label>
      <label className="flex flex-col gap-1 max-w-[12rem]">
        <FieldLabel>Priority</FieldLabel>
        <select name="priority" defaultValue="MEDIUM" className={inputClass}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </label>
      <div className="flex flex-col gap-2">
        <FieldLabel>Photos (optional, up to 5)</FieldLabel>
        <ImageUploader
          purpose="maintenance-image"
          multiple
          accept="image/*"
          onUploaded={(u) => setImages((prev) => [...prev, u])}
        />
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((im) => (
              <div key={im.id} className="group relative overflow-hidden rounded-md border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.fileName} className="h-16 w-16 object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((p) => p.id !== im.id))}
                  className="absolute right-0.5 top-0.5 rounded bg-white/90 px-1 text-xs text-red-600 shadow"
                  aria-label={`Remove ${im.fileName}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {images.map((im) => (
          <input key={im.id} type="hidden" name="imageUrls" value={im.url} />
        ))}
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={btn("primary")}>{pending ? "Submitting…" : "Submit request"}</button>
    </form>
  );
}
