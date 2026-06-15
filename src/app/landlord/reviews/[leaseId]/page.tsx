import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { RateTenantForm } from "../RateTenantForm";

export const dynamic = "force-dynamic";

export default async function RateTenantPage({ params }: { params: Promise<{ leaseId: string }> }) {
  const { leaseId } = await params;
  const session = await auth();

  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, landlordId: session!.user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
    include: {
      tenant: { select: { fullName: true } },
      property: { select: { name: true } },
      ratings: { where: { direction: "LANDLORD_TO_TENANT" } },
    },
  });
  if (!lease) notFound();

  const existing = lease.ratings[0];
  const criteria = (existing?.criteria as Record<string, number> | null) ?? undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-sm"><Link href="/landlord/reviews" className="text-blue-600 hover:text-blue-700">← Back to ratings</Link></div>
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Rate {lease.tenant.fullName}</h1>
        <p className="text-sm text-slate-500">{lease.property.name} · lease {lease.status.toLowerCase()}</p>
      </div>
      <Card>
        <RateTenantForm
          leaseId={lease.id}
          defaults={existing ? { stars: existing.stars, feedback: existing.feedback ?? undefined, recommend: existing.recommend, criteria } : undefined}
        />
      </Card>
    </div>
  );
}
