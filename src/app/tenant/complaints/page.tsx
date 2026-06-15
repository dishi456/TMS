import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn } from "@/components/ui";
import { ComplaintForm } from "./ComplaintForm";

export const metadata: Metadata = { title: "Complaints" };
export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const tone = (s: string): "green" | "amber" | "red" | "slate" | "sky" =>
  s === "RESOLVED" ? "green" : s === "CLOSED" ? "slate" : s === "REOPENED" ? "red" : s === "RESPONDED" ? "sky" : "amber";

export default async function TenantComplaintsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const tenantId = session!.user.id;

  const [leases, complaints] = await Promise.all([
    prisma.lease.findMany({ where: { tenantId, status: { in: ["ACTIVE", "RENEWED"] } }, select: { property: { select: { id: true, name: true } } } }),
    prisma.complaint.findMany({ where: { tenantId }, include: { property: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const propMap = new Map<string, string>();
  for (const l of leases) propMap.set(l.property.id, l.property.name);
  const properties = [...propMap].map(([id, name]) => ({ id, name }));

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Complaints</h1>
      {sp.created && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">Complaint submitted.</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Raise a complaint</h2>
          <Card><ComplaintForm properties={properties} /></Card>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">My complaints</h2>
          {complaints.length === 0 ? (
            <Card><p className="text-sm text-slate-400">No complaints.</p></Card>
          ) : (
            <div className="space-y-2">
              {complaints.map((c) => (
                <Link key={c.id} href={`/tenant/complaints/${c.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{c.subject}</p>
                      <p className="text-xs text-slate-400">{c.property?.name ?? "General"} · {c.createdAt.toLocaleDateString("en-US")}</p>
                    </div>
                    <Badge tone={tone(c.status)}>{cap(c.status)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
