import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/tenant/lease/notice  { leaseId } -> give notice to vacate
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const { leaseId } = await req.json().catch(() => ({}));

  const lease = await prisma.lease.findFirst({ where: { id: String(leaseId ?? ""), tenantId: user.id } });
  if (!lease) return json({ error: "Lease not found." }, 404);
  if (!((lease.status === "ACTIVE" || lease.status === "RENEWED") && lease.noticeGivenAt === null)) {
    return json({ error: "Notice can only be given on an active lease that has no notice yet." }, 400);
  }

  const now = new Date();
  const effective = new Date(now.getTime() + lease.noticePeriodDays * 86400000);
  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data: { noticeGivenAt: now, noticeByParty: "TENANT", noticeEffectiveDate: effective },
  });
  await audit({ actorId: user.id, action: "lease.notice", entity: "Lease", entityId: lease.id });
  await notify(lease.landlordId, { type: "lease", title: "Tenant gave notice to vacate", link: `/landlord/leases/${lease.id}` });

  return json({ ok: true, noticeEffectiveDate: updated.noticeEffectiveDate });
}
