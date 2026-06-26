import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { leaseNumber } from "@/lib/chat";
import { deleteChatMessage } from "../actions";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function AdminChatThreadPage({ params }: { params: Promise<{ leaseId: string }> }) {
  const { leaseId } = await params;
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      property: { select: { name: true } },
      tenant: { select: { id: true, fullName: true } },
      landlord: { select: { id: true, fullName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, attachmentUrl: true, attachmentType: true, readAt: true, createdAt: true, senderId: true },
      },
    },
  });
  if (!lease) notFound();

  const nameOf = (senderId: string) => (senderId === lease.tenant.id ? lease.tenant.fullName : lease.landlord.fullName);

  return (
    <div className="space-y-4">
      <Link href="/master-admin/chat" className="text-sm text-slate-500 hover:text-slate-700">← All conversations</Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{lease.property.name}</h1>
          <p className="text-sm text-slate-500">{lease.landlord.fullName} (landlord) ↔ {lease.tenant.fullName} (tenant)</p>
        </div>
        <Badge tone="slate">{leaseNumber(lease.id)}</Badge>
      </div>

      <Card>
        {lease.messages.length === 0 ? (
          <p className="text-sm text-slate-400">No messages in this conversation.</p>
        ) : (
          <ul className="space-y-3">
            {lease.messages.map((m) => {
              const fromTenant = m.senderId === lease.tenant.id;
              return (
                <li key={m.id} className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${fromTenant ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                    {nameOf(m.senderId).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-600">
                        {nameOf(m.senderId)} <span className="text-slate-400">· {fromTenant ? "Tenant" : "Landlord"}</span>
                      </p>
                      <span className="text-[11px] text-slate-400">{m.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    {m.attachmentUrl && (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-600 underline">
                        {m.attachmentType === "image" ? "📷 View image" : "📎 View attachment"}
                      </a>
                    )}
                    {m.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>}
                  </div>
                  <form action={deleteChatMessage} className="shrink-0">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="leaseId" value={lease.id} />
                    <ConfirmButton message="Delete this message? This is permanent." className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600">Delete</ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
