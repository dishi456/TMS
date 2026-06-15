import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { Badge, Card } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { PropertyFeatures } from "@/components/PropertyFeatures";
import { ApplyForm } from "./ApplyForm";
import { VisitForm } from "./VisitForm";

export const metadata: Metadata = { title: "Property" };
export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findFirst({
    where: { id, approved: true },
    include: { documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" } } },
  });
  if (!property) notFound();

  const available = property.availability === "AVAILABLE";

  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/listings"><Logo className="h-9" /></Link>
          <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Sign in</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/listings" className="text-sm text-blue-600 hover:text-blue-700">← All properties</Link>

        <div className="mt-3 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {property.documents.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {property.documents.map((d, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={d.id} src={`/api/files/${d.id}`} alt={`${property.name} ${i + 1}`} className={`w-full rounded-xl border border-slate-200 object-cover ${i === 0 ? "col-span-2 h-72" : "h-40"}`} />
                ))}
              </div>
            ) : (
              <div className="flex h-72 w-full items-center justify-center rounded-xl bg-slate-100 text-5xl text-slate-300">🏢</div>
            )}

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">{property.name}</h1>
                {available ? <Badge tone="green">Available</Badge> : <Badge tone="slate">Occupied</Badge>}
              </div>
              <p className="text-sm text-slate-500">{property.address}</p>
              {property.description && <p className="mt-3 text-sm text-slate-700">{property.description}</p>}

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Fact label="Rent" value={`${formatMoney(property.rentAmount)}/mo`} />
                <Fact label="Deposit" value={formatMoney(property.securityDeposit)} />
                <Fact label="Type" value={property.type.charAt(0) + property.type.slice(1).toLowerCase()} />
              </div>

              <div className="mt-5">
                <h2 className="mb-2 text-sm font-semibold text-slate-700">Features &amp; layout</h2>
                <PropertyFeatures p={property} />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Apply for this property</h2>
              <Card>
                {available ? (
                  <ApplyForm propertyId={property.id} />
                ) : (
                  <p className="text-sm text-slate-500">This property is currently occupied. Check back later or browse other listings.</p>
                )}
              </Card>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">📅 Schedule a visit</h2>
              <Card>
                <VisitForm propertyId={property.id} />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
