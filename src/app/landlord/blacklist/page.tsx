import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BlacklistForm } from "./BlacklistForm";
import { removeFromBlacklist } from "./actions";

export const metadata: Metadata = { title: "Blacklist" };
export const dynamic = "force-dynamic";

export default async function LandlordBlacklistPage() {
  const session = await auth();
  const landlordId = session!.user.id;

  const [entries, candidates] = await Promise.all([
    prisma.blacklist.findMany({
      where: { landlordId },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { id: true, fullName: true, email: true } } },
    }),
    // Tenants this landlord manages or has a lease with — the only ones blacklistable.
    prisma.user.findMany({
      where: { role: "TENANT", OR: [{ landlordId }, { tenantLeases: { some: { landlordId } } }] },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
  ]);

  const blacklistedIds = new Set(entries.map((e) => e.tenantId));
  const available = candidates.filter((c) => !blacklistedIds.has(c.id)).map((c) => ({ id: c.id, name: c.fullName, email: c.email }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Tenant Blacklist</h1>
        <p className="text-sm text-slate-500">Flag tenants you no longer wish to rent to, with a reason for your records.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {entries.length === 0 ? (
            <Card><p className="text-sm text-slate-400">No tenants blacklisted.</p></Card>
          ) : (
            entries.map((e) => (
              <Card key={e.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{e.tenant.fullName}</p>
                    <p className="text-xs text-slate-500">{e.tenant.email}</p>
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{e.reason}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Added {e.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                  </div>
                  <form action={removeFromBlacklist}>
                    <input type="hidden" name="tenantId" value={e.tenantId} />
                    <ConfirmButton message={`Remove ${e.tenant.fullName} from your blacklist?`} className={btn("secondary")}>Remove</ConfirmButton>
                  </form>
                </div>
              </Card>
            ))
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Add to blacklist</h2>
          <Card><BlacklistForm candidates={available} /></Card>
        </div>
      </div>
    </div>
  );
}
