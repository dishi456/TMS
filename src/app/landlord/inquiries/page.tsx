import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { timeAgo } from "@/lib/activity";

export const metadata: Metadata = { title: "Chats" };
export const dynamic = "force-dynamic";

export default async function LandlordInquiriesPage() {
  const session = await auth();
  const meId = session!.user.id;

  const inquiries = await prisma.propertyInquiry.findMany({
    where: { landlordId: meId },
    include: {
      property: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: { where: { fromGuest: true, readByLandlord: false } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const pending = inquiries.reduce((n, i) => n + i._count.messages, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-800">
          Chats <span className="text-slate-400">({formatNumber(inquiries.length)})</span>
        </h1>
        {pending > 0 && <Badge tone="amber">{pending} unread</Badge>}
      </div>
      <p className="text-sm text-slate-500">Public chat enquiries from people browsing your listings.</p>

      {inquiries.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No enquiries yet. When someone messages you from a public listing, it&apos;ll appear here.</p></Card>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {inquiries.map((i) => (
            <Link key={i.id} href={`/landlord/inquiries/${i.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {i.guestName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  {i.guestName}
                  <span className="text-xs font-normal text-slate-400">· {i.property.name}</span>
                  {i._count.messages > 0 && <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{i._count.messages}</span>}
                </p>
                <p className="truncate text-xs text-slate-400">📞 {i.guestPhone}{i.messages[0] ? ` · ${i.messages[0].fromGuest ? "" : "You: "}${i.messages[0].body}` : ""}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{timeAgo(i.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
