import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Enquiries" };
export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const inquiries = await prisma.propertyInquiry.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      property: { select: { id: true, name: true, address: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: { where: { fromGuest: false, readByGuest: false } } } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My enquiries</h1>
        <p className="mt-1 text-sm text-slate-500">Conversations you’ve started with property owners.</p>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <p className="text-4xl">💬</p>
          <p className="mt-3 text-sm font-medium text-slate-600">No enquiries yet.</p>
          <p className="mt-1 text-xs text-slate-400">Open a listing and tap “Chat with owner” to start.</p>
          <Link href="/listings" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Browse properties</Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {inquiries.map((q) => {
            const unread = q._count.messages;
            const last = q.messages[0];
            return (
              <Link key={q.id} href={`/listings/${q.property.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">🏠</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{q.property.name}</p>
                    {unread > 0 && <span className="shrink-0 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-5 text-white">{unread} new</span>}
                  </div>
                  <p className="truncate text-xs text-slate-400">
                    {last ? `${last.fromGuest ? "You: " : ""}${last.body}` : q.property.address}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{q.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
