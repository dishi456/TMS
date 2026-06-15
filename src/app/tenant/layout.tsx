import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TenantShell } from "@/components/TenantShell";
import { logout } from "@/app/actions/auth";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const tenantId = session!.user.id;
  const me = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { status: true, landlord: { select: { fullName: true } } },
  });

  // Onboarding gate: a pending tenant waits for their landlord to approve them.
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
            ⏳ Your account is awaiting approval{me.landlord ? ` from ${me.landlord.fullName}` : ""}. You&apos;ll get
            access to your portal once approved.
          </div>
        </div>
      </div>
    );
  }

  const unread = await prisma.notification.count({ where: { userId: tenantId, read: false } });

  return (
    <TenantShell userName={session?.user?.name ?? "Tenant"} unread={unread}>
      {children}
    </TenantShell>
  );
}
