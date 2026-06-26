import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card, Badge, btn, inputClass } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PropertyImage } from "@/components/PropertyImage";
import { toStrArr } from "@/lib/json";
import { removeListing, setListingStatusAdmin } from "./actions";

export const metadata: Metadata = { title: "Marketplace Moderation" };
export const dynamic = "force-dynamic";

function price(amount: unknown, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount)}`;
  }
}

export default async function AdminMarketplacePage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status === "SOLD" || sp.status === "AVAILABLE" ? sp.status : undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }, { category: { contains: q } }];

  const [listings, total, available, sold] = await Promise.all([
    prisma.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { seller: { select: { fullName: true, email: true } }, _count: { select: { favorites: true } } },
    }),
    prisma.marketplaceListing.count(),
    prisma.marketplaceListing.count({ where: { status: "AVAILABLE" } }),
    prisma.marketplaceListing.count({ where: { status: "SOLD" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Marketplace Moderation</h1>
        <p className="text-sm text-slate-500">Review and take down member buy/sell listings. {total} total · {available} available · {sold} sold.</p>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search title, description, category…" className={`${inputClass} flex-1 py-2 text-sm`} />
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputClass} py-2 text-sm`}>
          <option value="">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="SOLD">Sold</option>
        </select>
        <button className={`${btn("secondary")} py-2`}>Filter</button>
      </form>

      {listings.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No listings found.</p></Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const img = toStrArr(l.images)[0] ?? null;
            return (
              <Card key={l.id}>
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <PropertyImage src={img} alt={l.title} emoji="🛍️" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{l.title}</p>
                      <Badge tone="sky">{l.category}</Badge>
                      <Badge tone={l.status === "SOLD" ? "red" : "green"}>{l.status}</Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{price(l.price, l.currency)}</p>
                    <p className="text-xs text-slate-500">
                      {l.seller.fullName} · {l.seller.email} · {l._count.favorites} ♥ · {l.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <form action={setListingStatusAdmin}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="status" value={l.status === "SOLD" ? "AVAILABLE" : "SOLD"} />
                      <button className={btn("secondary", "w-full")}>{l.status === "SOLD" ? "Mark available" : "Mark sold"}</button>
                    </form>
                    <form action={removeListing}>
                      <input type="hidden" name="id" value={l.id} />
                      <ConfirmButton message={`Remove “${l.title}”? This permanently deletes the listing.`} className={btn("danger", "w-full")}>Remove</ConfirmButton>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
