import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatMoney, formatNumber } from "@/lib/format";
import { setApproved, deleteProperty } from "./actions";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  availability?: string;
  approval?: string;
  created?: string;
  deleted?: string;
  error?: string;
};

const AVAIL = ["AVAILABLE", "OCCUPIED", "UNAVAILABLE"];

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const availability = AVAIL.includes(sp.availability ?? "") ? sp.availability : "";
  const approval = sp.approval === "PENDING" || sp.approval === "APPROVED" ? sp.approval : "";

  const where: Prisma.PropertyWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { address: { contains: q } },
          ],
        }
      : {}),
    ...(availability ? { availability: availability as Prisma.PropertyWhereInput["availability"] } : {}),
    ...(approval ? { approved: approval === "APPROVED" } : {}),
  };

  const properties = await prisma.property.findMany({
    where,
    include: {
      landlord: { select: { fullName: true } },
      documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      {sp.created && <Banner tone="green">Property added successfully.</Banner>}
      {sp.deleted && <Banner tone="green">Property removed.</Banner>}
      {sp.error === "has-data" && (
        <Banner tone="amber">
          This property has leases, maintenance or complaints attached and cannot be removed.
        </Banner>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">
          All Properties <span className="text-slate-400">({formatNumber(properties.length)})</span>
        </h2>
        <Link href="/master-admin/properties/new" className={btn("primary")}>
          + New Property
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or address…"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select name="availability" defaultValue={availability} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any availability</option>
          {AVAIL.map((a) => (
            <option key={a} value={a}>
              {a.charAt(0) + a.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select name="approval" defaultValue={approval} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Any approval</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
        </select>
        <button className={btn("secondary")}>Filter</button>
        {(q || availability || approval) && (
          <Link href="/master-admin/properties" className={btn("ghost")}>
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Landlord</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Rent</th>
              <th className="px-4 py-3 font-medium">Units</th>
              <th className="px-4 py-3 font-medium">Availability</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {properties.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No properties found.
                </td>
              </tr>
            )}
            {properties.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.documents[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${p.documents[0].id}`}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300">
                        🏢
                      </span>
                    )}
                    <div>
                      <Link href={`/master-admin/properties/${p.id}`} className="font-medium text-slate-800 hover:text-blue-700">
                        {p.name}
                      </Link>
                      <div className="text-xs text-slate-400">{p.address}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.landlord.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{p.type.charAt(0) + p.type.slice(1).toLowerCase()}</td>
                <td className="px-4 py-3 text-slate-700">{formatMoney(p.rentAmount)}</td>
                <td className="px-4 py-3 text-slate-600">{formatNumber(p.numberOfUnits)}</td>
                <td className="px-4 py-3">
                  <AvailabilityBadge value={p.availability} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.approved ? <Badge tone="green">Approved</Badge> : <Badge tone="amber">Pending</Badge>}
                    {p.verified ? <Badge tone="sky">Docs verified</Badge> : <Badge tone="slate">Unverified</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/master-admin/properties/${p.id}`} className={btn("secondary", "px-2.5 py-1.5")}>
                      Manage
                    </Link>
                    <form action={setApproved}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="approved" value={p.approved ? "false" : "true"} />
                      <button className={btn("ghost", "px-2.5 py-1.5")}>
                        {p.approved ? "Unapprove" : "Approve"}
                      </button>
                    </form>
                    <form action={deleteProperty}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton
                        message={`Remove ${p.name}? This cannot be undone.`}
                        className={btn("danger", "px-2.5 py-1.5")}
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AvailabilityBadge({ value }: { value: string }) {
  if (value === "OCCUPIED") return <Badge tone="sky">Occupied</Badge>;
  if (value === "UNAVAILABLE") return <Badge tone="slate">Unavailable</Badge>;
  return <Badge tone="green">Available</Badge>;
}

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
