import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LandlordPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const landlordId = session!.user.id;

  const properties = await prisma.property.findMany({
    where: { landlordId },
    include: {
      documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" } },
      leases: {
        where: { status: { in: ["ACTIVE", "RENEWED"] } },
        select: { id: true, tenant: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      {sp.created && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Property added — awaiting Master Admin approval.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-800">
          My Properties <span className="text-slate-400">({formatNumber(properties.length)})</span>
        </h1>
        <Link href="/landlord/properties/new" className={btn("primary")}>+ Add Property</Link>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
          No properties yet. Add your first one.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/landlord/properties/${p.id}`}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-300"
            >
              {p.documents[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${p.documents[0].id}`} alt="" className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-3xl text-slate-300">🏢</div>
              )}
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    {p.approved ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Pending</Badge>}
                    {!p.listedPublic && <Badge tone="slate">Private</Badge>}
                  </div>
                </div>
                <p className="truncate text-xs text-slate-400">{p.address}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{formatMoney(p.rentAmount)}/mo</span>
                  <AvailBadge value={p.availability} />
                </div>
                {/* Which tenant(s) this property is assigned to */}
                <div className="mt-2 border-t border-slate-100 pt-2">
                  {p.leases.length === 0 ? (
                    <p className="text-xs text-slate-400">👤 Vacant — no tenant assigned</p>
                  ) : (
                    <p className="text-xs text-slate-600">
                      👤 <span className="font-medium">{p.leases.map((l) => l.tenant.fullName).join(", ")}</span>
                      {p.numberOfUnits > 1 && <span className="text-slate-400"> · {p.leases.length}/{p.numberOfUnits} units</span>}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AvailBadge({ value }: { value: string }) {
  if (value === "OCCUPIED") return <Badge tone="sky">Occupied</Badge>;
  if (value === "UNAVAILABLE") return <Badge tone="slate">Unavailable</Badge>;
  return <Badge tone="green">Available</Badge>;
}
