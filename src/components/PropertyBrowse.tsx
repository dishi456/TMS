import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, btn, inputClass } from "@/components/ui";
import { PropertyImage } from "@/components/PropertyImage";
import { formatMoney, formatNumber } from "@/lib/format";
import { propertyPath } from "@/lib/property-path";
import { PROPERTY_TYPES, propertyTypeLabel } from "@/lib/property-details";

type SP = { q?: string; type?: string };

// Portal property marketplace: browse the live, available rental homes. Cards
// link to the public listing detail (photos, apply, book a visit).
export async function PropertyBrowse({ params }: { params: SP }) {
  const q = params.q?.trim();
  const type = params.type && (PROPERTY_TYPES as readonly string[]).includes(params.type) ? params.type : undefined;

  const where: Record<string, unknown> = { approved: true, listedPublic: true, availability: "AVAILABLE" };
  if (type) where.type = type;
  if (q) where.OR = [{ name: { contains: q } }, { address: { contains: q } }, { city: { contains: q } }];

  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true, name: true, address: true, type: true, ref: true, rentAmount: true,
      rooms: true, bathrooms: true, areaSqft: true,
      documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Marketplace</h1>
        <p className="text-sm text-slate-500">Browse verified homes available to rent.</p>
      </div>

      {/* Filters */}
      <form method="get" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input name="q" defaultValue={params.q} placeholder="Search by name or city…" className={`${inputClass} col-span-2 py-2 text-sm`} />
        <select name="type" defaultValue={params.type ?? ""} className={`${inputClass} py-2 text-sm`}>
          <option value="">All types</option>
          {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{propertyTypeLabel(t)}</option>)}
        </select>
        <button className={`${btn("secondary")} py-2`}>Search</button>
      </form>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-400">No homes match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {properties.map((p) => {
            const photo = p.documents[0] ? `/api/files/${p.documents[0].id}` : null;
            return (
              <Link key={p.id} href={propertyPath(p)} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="aspect-[4/3] bg-slate-100">
                  <PropertyImage src={photo} alt={p.name} className="transition-transform group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="line-clamp-1 text-xs text-slate-400">{p.address}</p>
                  <p className="text-sm font-bold text-slate-900">{formatMoney(p.rentAmount)}<span className="font-normal text-slate-400">/mo</span></p>
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                    <Badge tone="sky">{propertyTypeLabel(p.type)}</Badge>
                    {p.rooms != null && <Badge tone="slate">{p.rooms} bd</Badge>}
                    {p.areaSqft != null && <Badge tone="slate">{formatNumber(p.areaSqft)} sq ft</Badge>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
