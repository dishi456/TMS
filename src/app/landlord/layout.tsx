import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LandlordShell } from "@/components/LandlordShell";
import { VerificationDocs } from "@/components/VerificationDocs";
import { logout } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: { template: "%s · Landlord", default: "Landlord Dashboard" },
};

export default async function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const me = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { status: true, verified: true },
  });

  // Onboarding gate: a pending landlord uploads documents and waits for the
  // Master Admin to approve, before the portal unlocks.
  if (me?.status === "PENDING") {
    return (
      <div className="min-h-dvh bg-slate-50 px-5 py-8 text-slate-800">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">Welcome, {session!.user.name}</h1>
            <form action={logout}>
              <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600">Sign out</button>
            </form>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⏳ Your landlord account is awaiting Master Admin approval. Upload your documents below to
            speed up verification — the portal unlocks once you&apos;re approved.
          </div>
          <VerificationDocs userId={session!.user.id} />
        </div>
      </div>
    );
  }

  const landlordId = session!.user.id;
  const [unread, chatUnread, pendingApps, pendingVisits] = await Promise.all([
    prisma.notification.count({ where: { userId: landlordId, read: false } }),
    prisma.inquiryMessage.count({ where: { fromGuest: true, readByLandlord: false, inquiry: { landlordId } } }),
    prisma.application.count({ where: { status: "PENDING", property: { landlordId } } }),
    prisma.visit.count({ where: { status: "PENDING", property: { landlordId } } }),
  ]);
  // Total open inbound requests for the "Requests" nav badge.
  const requestsPending = pendingApps + pendingVisits + chatUnread;

  return (
    <LandlordShell userName={session?.user?.name ?? "Landlord"} verified={me?.verified ?? false} unread={unread} chatUnread={chatUnread} requestsPending={requestsPending}>
      {children}
    </LandlordShell>
  );
}
