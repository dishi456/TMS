"use client";

import { useActionState, useState } from "react";
import { createListing, updateListing, type ListingFormState } from "@/app/actions/marketplace";
import { ImageUploader, type Uploaded } from "@/components/ImageUploader";
import { FieldLabel, inputClass, btn } from "@/components/ui";
import { CATEGORIES, CONDITIONS } from "@/lib/marketplace";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/profile";

type Defaults = {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  price?: number;
  currency?: string;
  location?: string;
  images?: string[];
};

export function ListingForm({ basePath, defaults = {}, defaultCurrency = "INR" }: { basePath: string; defaults?: Defaults; defaultCurrency?: string }) {
  const editing = !!defaults.id;
  const action = editing ? updateListing : createListing;
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(action, undefined);
  const [images, setImages] = useState<string[]>(defaults.images ?? []);

  function onUploaded(u: Uploaded) {
    setImages((prev) => (prev.length >= 8 ? prev : [...prev, u.url]));
  }
  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="basePath" value={basePath} />
      {editing && <input type="hidden" name="id" value={defaults.id} />}
      {images.map((u) => <input key={u} type="hidden" name="images" value={u} />)}

      <label className="flex flex-col gap-1"><FieldLabel>Title</FieldLabel><input name="title" required defaultValue={defaults.title} placeholder="e.g. IKEA study desk" className={inputClass} /></label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <FieldLabel>Category</FieldLabel>
          <select name="category" required defaultValue={defaults.category ?? ""} className={inputClass}>
            <option value="" disabled>Choose…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Condition</FieldLabel>
          <select name="condition" required defaultValue={defaults.condition ?? "GOOD"} className={inputClass}>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Price</FieldLabel>
          <input name="price" type="number" min="0" step="1" required defaultValue={defaults.price} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Currency</FieldLabel>
          <select name="currency" defaultValue={defaults.currency ?? defaultCurrency} className={inputClass}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1"><FieldLabel>Location</FieldLabel><input name="location" defaultValue={defaults.location} placeholder="e.g. Bandra, Mumbai" className={inputClass} /></label>
      <label className="flex flex-col gap-1"><FieldLabel>Description</FieldLabel><textarea name="description" rows={4} defaultValue={defaults.description} placeholder="Condition, age, reason for selling…" className={inputClass} /></label>

      <div className="space-y-2">
        <FieldLabel>Photos (up to 8)</FieldLabel>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((u) => (
              <div key={u} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeImage(u)} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white">×</button>
              </div>
            ))}
          </div>
        )}
        {images.length < 8 && <ImageUploader purpose="marketplace-photo" accept="image/*" buttonLabel="Add photo" onUploaded={onUploaded} />}
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={btn("primary")}>{pending ? "Saving…" : editing ? "Save changes" : "Post listing"}</button>
    </form>
  );
}
