import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { LandlordLeaseForm } from "../LandlordLeaseForm";

export const metadata: Metadata = { title: "New Lease" };
export const dynamic = "force-dynamic";

export default async function NewLeasePage() {
  const session = await auth();
  const landlordId = session!.user.id;

  const [properties, tenants] = await Promise.all([
    prisma.property.findMany({ where: { landlordId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "TENANT", landlordId, status: "ACTIVE" }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm">
        <Link href="/landlord/leases" className="text-blue-600 hover:text-blue-700">← Back to leases</Link>
      </div>
      <h1 className="text-lg font-semibold text-slate-800">Create a lease</h1>
      <Card>
        {properties.length === 0 || tenants.length === 0 ? (
          <p className="text-sm text-slate-500">
            You need at least one property and one active tenant first.
          </p>
        ) : (
          <LandlordLeaseForm mode="create" properties={properties} tenants={tenants} />
        )}
      </Card>
    </div>
  );
}
