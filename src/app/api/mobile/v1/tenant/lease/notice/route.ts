import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/tenant/lease/notice → give notice to vacate.
// Mirrors src/app/tenant/lease/actions.ts (giveNotice). The effective date is
// computed from the lease's noticePeriodDays.
export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const lease = await prisma.lease.findFirst({
    where: { tenantId: user.id, status: { in: ["ACTIVE", "RENEWED"] } },
    orderBy: { startDate: "desc" },
  });
  if (!lease) return error("No active lease found.", 404);
  if (lease.noticeGivenAt) return error("Notice has already been given on this lease.", 409);

  const now = new Date();
  const effective = new Date(now.getTime() + lease.noticePeriodDays * 86_400_000);
  await prisma.lease.update({
    where: { id: lease.id },
    data: { noticeGivenAt: now, noticeByParty: "TENANT", noticeEffectiveDate: effective },
  });
  await audit({ actorId: user.id, action: "lease.notice", entity: "Lease", entityId: lease.id });
  await notify(lease.landlordId, {
    type: "lease",
    title: "Tenant gave notice to vacate",
    link: `/landlord/leases/${lease.id}`,
  });

  return json({ ok: true, noticeEffectiveDate: effective.toISOString() });
}
