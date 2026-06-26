import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Badge, btn, inputClass } from "@/components/ui";
import { leaseNumber } from "@/lib/chat";

export const metadata: Metadata = { title: "Chat Moderation" };
export const dynamic = "force-dynamic";

export default async function AdminChatPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  // Only leases that actually have messages are "conversations".
  const where: Record<string, unknown> = { messages: { some: {} } };
  if (q) {
    where.OR = [
      { property: { name: { contains: q } } },
      { tenant: { fullName: { contains: q } } },
      { landlord: { fullName: { contains: q } } },
    ];
  }

  const leases = await prisma.lease.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      property: { select: { name: true } },
      tenant: { select: { fullName: true } },
      landlord: { select: { fullName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, attachmentType: true, createdAt: true } },
      _count: { select: { messages: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Chat Moderation</h1>
        <p className="text-sm text-slate-500">Oversee per-lease conversations between tenants and landlords. {leases.length} active conversation{leases.length === 1 ? "" : "s"}.</p>
      </div>

      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search by property, tenant or landlord…" className={`${inputClass} flex-1 py-2 text-sm`} />
        <button className={`${btn("secondary")} py-2`}>Search</button>
      </form>

      {leases.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No conversations found.</p></Card>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {leases.map((l) => {
            const last = l.messages[0];
            const preview = last ? (last.body ?? (last.attachmentType === "image" ? "📷 Photo" : "📎 Attachment")) : "—";
            return (
              <Link key={l.id} href={`/master-admin/chat/${l.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{l.property.name}</p>
                    <Badge tone="slate">{leaseNumber(l.id)}</Badge>
                  </div>
                  <p className="truncate text-xs text-slate-500">{l.landlord.fullName} ↔ {l.tenant.fullName}</p>
                  <p className="truncate text-xs text-slate-400">{preview}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-slate-600">{l._count.messages} msg{l._count.messages === 1 ? "" : "s"}</p>
                  {last && <p className="text-[11px] text-slate-400">{last.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
