import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { timeAgo } from "@/lib/activity";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function LandlordMessagesPage() {
  const session = await auth();
  const meId = session!.user.id;

  const [tenants, msgs] = await Promise.all([
    prisma.user.findMany({ where: { role: "TENANT", landlordId: meId }, select: { id: true, fullName: true, email: true }, orderBy: { fullName: "asc" } }),
    prisma.message.findMany({ where: { OR: [{ senderId: meId }, { recipientId: meId }] }, orderBy: { createdAt: "desc" } }),
  ]);

  // Per-tenant: last message + unread (tenant → me, unread) count.
  const lastByTenant = new Map<string, { body: string; at: Date }>();
  const unreadByTenant = new Map<string, number>();
  for (const m of msgs) {
    const other = m.senderId === meId ? m.recipientId : m.senderId;
    if (!lastByTenant.has(other)) lastByTenant.set(other, { body: m.body, at: m.createdAt });
    if (m.recipientId === meId && !m.read) unreadByTenant.set(m.senderId, (unreadByTenant.get(m.senderId) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Messages</h1>
        <p className="text-sm text-slate-500">Chat directly with your tenants and answer their queries.</p>
      </div>

      {tenants.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No tenants yet. Once you add tenants, you can message them here.</p></Card>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {tenants.map((t) => {
            const last = lastByTenant.get(t.id);
            const unread = unreadByTenant.get(t.id) ?? 0;
            return (
              <Link key={t.id} href={`/landlord/messages/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {t.fullName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium text-slate-800">
                    {t.fullName}
                    {unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{unread}</span>}
                  </p>
                  <p className="truncate text-xs text-slate-400">{last ? last.body : t.email}</p>
                </div>
                {last && <span className="shrink-0 text-xs text-slate-400">{timeAgo(last.at)}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
