import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/leases/{id} -> lease detail + invoices
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const l = await prisma.lease.findFirst({
    where: { id, landlordId: user.id },
    include: {
      property: { select: { id: true, name: true, address: true } },
      tenant: { select: { id: true, fullName: true, email: true, phone: true } },
      invoices: { orderBy: { dueDate: "desc" }, select: { id: true, periodMonth: true, amount: true, dueDate: true, status: true } },
    },
  });
  if (!l) return json({ error: "Not found." }, 404);
  return json({
    lease: {
      id: l.id, status: l.status, monthlyRent: Number(l.monthlyRent), securityDeposit: Number(l.securityDeposit),
      maintenanceFee: l.maintenanceFee != null ? Number(l.maintenanceFee) : null,
      startDate: l.startDate, endDate: l.endDate, terms: l.terms, signedContractUrl: l.signedContractUrl,
      noticePeriodDays: l.noticePeriodDays, noticeGivenAt: l.noticeGivenAt, noticeByParty: l.noticeByParty, noticeEffectiveDate: l.noticeEffectiveDate,
      property: l.property, tenant: l.tenant,
      invoices: l.invoices.map((i) => ({ ...i, amount: Number(i.amount) })),
    },
  });
}
