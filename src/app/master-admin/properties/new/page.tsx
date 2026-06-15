import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { PropertyForm } from "../PropertyForm";

export const metadata: Metadata = { title: "New Property" };
export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const landlords = await prisma.user.findMany({
    where: { role: "LANDLORD" },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm">
        <Link href="/master-admin/properties" className="text-blue-600 hover:text-blue-700">
          ← Back to properties
        </Link>
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Add a new property</h2>
      <Card>
        {landlords.length === 0 ? (
          <p className="text-sm text-slate-500">
            Create a landlord first — a property must be owned by a landlord.
          </p>
        ) : (
          <PropertyForm mode="create" landlords={landlords} />
        )}
      </Card>
    </div>
  );
}
