import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Requests" };
export const dynamic = "force-dynamic";

type Kind = "application" | "visit" | "enquiry";
type Row = {
  kind: Kind;
  id: string;
  who: string;
  property: string;
  when: Date;
  statusLabel: string;
  tone: "amber" | "green" | "red" | "sky" | "slate";
  pending: boolean;
  href: string;
  sub: string;
};

const KIND_META: Record<Kind, { label: string; emoji: string; chipTone: string }> = {
  application: { label: "Application", emoji: "📝", chipTone: "bg-blue-50 text-blue-700" },
  visit: { label: "Visit", emoji: "📅", chipTone: "bg-violet-50 text-violet-700" },
  enquiry: { label: "Enquiry", emoji: "💬", chipTone: "bg-emerald-50 text-emerald-700" },
};

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const when = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; pending?: string }>;
}) {
  const sp = await searchParams;
  const type = (["application", "visit", "enquiry"] as const).includes(sp.type as Kind) ? (sp.type as Kind) : "all";
  const pendingOnly = sp.pending === "1";

  const session = await auth();
  const landlordId = session!.user.id;

  const [apps, visits, inquiries] = await Promise.all([
    prisma.application.findMany({
      where: { property: { landlordId } },
      include: { property: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.visit.findMany({
      where: { property: { landlordId } },
      include: { property: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propertyInquiry.findMany({
      where: { landlordId },
      include: {
        property: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: { where: { fromGuest: true, readByLandlord: false } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const rows: Row[] = [
    ...apps.map((a): Row => ({
      kind: "application",
      id: a.id,
      who: a.fullName,
      property: a.property.name,
      when: a.createdAt,
      statusLabel: cap(a.status),
      tone: a.status === "PENDING" ? "amber" : a.status === "APPROVED" ? "green" : "red",
      pending: a.status === "PENDING",
      href: "/landlord/applications",
      sub: a.message?.trim() || "Wants to rent this property.",
    })),
    ...visits.map((v): Row => ({
      kind: "visit",
      id: v.id,
      who: v.fullName,
      property: v.property.name,
      when: v.createdAt,
      statusLabel: cap(v.status),
      tone: v.status === "PENDING" ? "amber" : v.status === "CONFIRMED" ? "green" : v.status === "DECLINED" || v.status === "CANCELLED" ? "red" : "slate",
      pending: v.status === "PENDING",
      href: "/landlord/visits",
      sub: `Preferred ${when(v.preferredAt)}${v.message?.trim() ? ` · ${v.message.trim()}` : ""}`,
    })),
    ...inquiries.map((i): Row => {
      const unreadCount = i._count.messages;
      return {
        kind: "enquiry",
        id: i.id,
        who: i.guestName,
        property: i.property.name,
        when: i.updatedAt,
        statusLabel: unreadCount > 0 ? `${unreadCount} new` : "Chat",
        tone: unreadCount > 0 ? "amber" : "sky",
        pending: unreadCount > 0,
        href: `/landlord/inquiries/${i.id}`,
        sub: i.messages[0] ? `${i.messages[0].fromGuest ? "" : "You: "}${i.messages[0].body}` : "New enquiry",
      };
    }),
  ].sort((a, b) => +b.when - +a.when);

  const counts = {
    application: rows.filter((r) => r.kind === "application" && r.pending).length,
    visit: rows.filter((r) => r.kind === "visit" && r.pending).length,
    enquiry: rows.filter((r) => r.kind === "enquiry" && r.pending).length,
  };
  const totalPending = counts.application + counts.visit + counts.enquiry;

  const shown = rows.filter((r) => (type === "all" || r.kind === type) && (!pendingOnly || r.pending));

  const qs = (next: { type?: string; pending?: string }) => {
    const p = new URLSearchParams();
    const t = next.type ?? (type === "all" ? "" : type);
    const pe = next.pending ?? (pendingOnly ? "1" : "");
    if (t) p.set("type", t);
    if (pe) p.set("pending", pe);
    const s = p.toString();
    return `/landlord/requests${s ? `?${s}` : ""}`;
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-blue-300"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Requests</h1>
          <p className="mt-0.5 text-sm text-slate-500">Everything people send you — applications, visit requests and enquiries.</p>
        </div>
        {totalPending > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            {totalPending} need{totalPending === 1 ? "s" : ""} action
          </span>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        {(["application", "visit", "enquiry"] as const).map((k) => (
          <Link key={k} href={qs({ type: k, pending: "" })} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300">
            <p className="text-2xl">{KIND_META[k].emoji}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{counts[k]}</p>
            <p className="text-xs text-slate-500">pending {KIND_META[k].label.toLowerCase()}s</p>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={qs({ type: "" })} className={chip(type === "all")}>All</Link>
        <Link href={qs({ type: "application" })} className={chip(type === "application")}>Applications</Link>
        <Link href={qs({ type: "visit" })} className={chip(type === "visit")}>Visits</Link>
        <Link href={qs({ type: "enquiry" })} className={chip(type === "enquiry")}>Enquiries</Link>
        <Link href={qs({ pending: pendingOnly ? "" : "1" })} className={`${chip(pendingOnly)} ml-auto`}>
          {pendingOnly ? "✓ Pending only" : "Pending only"}
        </Link>
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <p className="text-4xl">📭</p>
          <p className="mt-3 text-sm font-medium text-slate-600">{pendingOnly ? "Nothing pending right now." : "No requests yet."}</p>
          <p className="mt-1 text-xs text-slate-400">When someone applies, books a visit or messages you about a property, it shows up here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {shown.map((r) => (
            <Link key={`${r.kind}-${r.id}`} href={r.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${KIND_META[r.kind].chipTone}`}>{KIND_META[r.kind].emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{r.who}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_META[r.kind].chipTone}`}>{KIND_META[r.kind].label}</span>
                  <Badge tone={r.tone}>{r.statusLabel}</Badge>
                </div>
                <p className="truncate text-xs text-slate-500">
                  <span className="text-slate-400">{r.property}</span> · {r.sub}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{when(r.when)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
