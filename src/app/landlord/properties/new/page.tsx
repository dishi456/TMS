import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { LandlordPropertyForm } from "../LandlordPropertyForm";

export const metadata: Metadata = { title: "Add Property" };

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm">
        <Link href="/landlord/properties" className="text-blue-600 hover:text-blue-700">← Back to properties</Link>
      </div>
      <h1 className="text-lg font-semibold text-slate-800">Add a property</h1>
      <p className="text-sm text-slate-500">Your property will be reviewed and approved by the Master Admin.</p>
      <Card>
        <LandlordPropertyForm mode="create" />
      </Card>
    </div>
  );
}
