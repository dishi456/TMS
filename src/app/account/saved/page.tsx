import type { Metadata } from "next";
import { SavedList } from "./SavedList";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Saved properties</h1>
        <p className="mt-1 text-sm text-slate-500">Listings you’ve hearted, kept on this device.</p>
      </div>
      <SavedList />
    </div>
  );
}
