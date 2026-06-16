import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AccountQuickLinks } from "./AccountQuickLinks";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function AccountHome() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = (session!.user.name ?? "there").split(" ")[0];

  const [enquiryCount, recent] = await Promise.all([
    prisma.inquiryMessage.count({ where: { fromGuest: false, readByGuest: false, inquiry: { userId } } }),
    prisma.propertyInquiry.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        property: { select: { id: true, name: true, address: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);

  return (
    <div className="space-y-7">
      {/* Greeting / hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 p-6 text-white shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <h1 className="text-2xl font-bold sm:text-3xl">Hi {firstName} 👋</h1>
        <p className="mt-1 max-w-md text-sm text-blue-50">Browse verified rentals, save your favourites and chat with owners directly — all in one place.</p>
        <Link href="/listings" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow hover:bg-blue-50">
          🔎 Browse properties
        </Link>
      </section>

      <AccountQuickLinks enquiryCount={enquiryCount} />

      {/* Recent enquiries */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Recent enquiries</h2>
          <Link href="/account/enquiries" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all →</Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <p className="text-3xl">💬</p>
            <p className="mt-2 text-sm font-medium text-slate-600">No enquiries yet.</p>
            <p className="mt-1 text-xs text-slate-400">Open any listing and tap “Chat with owner” to start a conversation.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {recent.map((q) => (
              <Link key={q.id} href={`/listings/${q.property.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">🏠</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{q.property.name}</p>
                  <p className="truncate text-xs text-slate-400">{q.messages[0]?.body ?? q.property.address}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{q.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
