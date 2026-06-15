import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { LeaseForm } from "../LeaseForm";

export const metadata: Metadata = { title: "New Lease" };
export const dynamic = "force-dynamic";

export default async function NewLeasePage() {
  const [properties, tenants] = await Promise.all([
    prisma.property.findMany({
      select: { id: true, name: true, landlord: { select: { fullName: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "TENANT" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const propertyOptions = properties.map((p) => ({
    id: p.id,
    name: p.name,
    landlordName: p.landlord.fullName,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm">
        <Link href="/master-admin/leases" className="text-blue-600 hover:text-blue-700">
          ← Back to leases
        </Link>
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Create a new lease</h2>
      <Card>
        {properties.length === 0 || tenants.length === 0 ? (
          <p className="text-sm text-slate-500">
            You need at least one property and one tenant before creating a lease.
          </p>
        ) : (
          <LeaseForm mode="create" properties={propertyOptions} tenants={tenants} />
        )}
      </Card>
    </div>
  );
}
