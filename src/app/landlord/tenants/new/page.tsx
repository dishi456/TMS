import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { AddTenantForm } from "../AddTenantForm";

export const metadata: Metadata = { title: "Add Tenant" };

export default function NewTenantPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-sm">
        <Link href="/landlord/tenants" className="text-blue-600 hover:text-blue-700">← Back to tenants</Link>
      </div>
      <h1 className="text-lg font-semibold text-slate-800">Add a tenant</h1>
      <p className="text-sm text-slate-500">
        Create an account for your tenant. They can sign in with the temporary password and change it later.
      </p>
      <Card>
        <AddTenantForm />
      </Card>
    </div>
  );
}
