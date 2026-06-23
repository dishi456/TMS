import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/lease → the tenant's active (or most recent) lease.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const lease = await prisma.lease.findFirst({
    where: { tenantId: user.id },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: {
      id: true,
      monthlyRent: true,
      securityDeposit: true,
      maintenanceFee: true,
      startDate: true,
      endDate: true,
      status: true,
      noticePeriodDays: true,
      noticeGivenAt: true,
      noticeEffectiveDate: true,
      signedContractUrl: true,
      property: {
        select: {
          id: true,
          name: true,
          address: true,
          documents: { where: { type: "PHOTO" }, orderBy: { createdAt: "asc" }, select: { id: true } },
        },
      },
      landlord: { select: { fullName: true, phone: true } },
    },
  });

  if (!lease) return json({ lease: null });

  return json({
    lease: {
      id: lease.id,
      monthlyRent: Number(lease.monthlyRent),
      securityDeposit: Number(lease.securityDeposit),
      maintenanceFee: lease.maintenanceFee != null ? Number(lease.maintenanceFee) : null,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      status: lease.status,
      noticePeriodDays: lease.noticePeriodDays,
      noticeGivenAt: lease.noticeGivenAt?.toISOString() ?? null,
      noticeEffectiveDate: lease.noticeEffectiveDate?.toISOString() ?? null,
      signedContractUrl: lease.signedContractUrl,
      property: {
        id: lease.property.id,
        name: lease.property.name,
        address: lease.property.address,
        photos: lease.property.documents.map((d) => `/api/files/${d.id}`),
      },
      landlord: { name: lease.landlord.fullName, phone: lease.landlord.phone },
    },
  });
}
