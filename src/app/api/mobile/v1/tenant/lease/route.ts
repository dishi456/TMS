import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const include = {
  property: {
    select: {
      id: true, name: true, address: true, type: true,
      documents: { where: { type: "PHOTO" as const }, select: { id: true }, orderBy: { createdAt: "asc" as const } },
    },
  },
  landlord: { select: { id: true, fullName: true, phone: true, email: true } },
};

// GET /api/mobile/v1/tenant/lease -> the tenant's current (active) lease
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;

  let lease = await prisma.lease.findFirst({
    where: { tenantId: user.id, status: { in: ["ACTIVE", "RENEWED"] } },
    orderBy: { createdAt: "desc" }, include,
  });
  if (!lease) lease = await prisma.lease.findFirst({ where: { tenantId: user.id }, orderBy: { createdAt: "desc" }, include });
  if (!lease) return json({ lease: null });

  return json({
    lease: {
      id: lease.id,
      status: lease.status,
      monthlyRent: Number(lease.monthlyRent),
      securityDeposit: Number(lease.securityDeposit),
      maintenanceFee: lease.maintenanceFee != null ? Number(lease.maintenanceFee) : null,
      startDate: lease.startDate,
      endDate: lease.endDate,
      terms: lease.terms,
      signedContractUrl: lease.signedContractUrl,
      noticePeriodDays: lease.noticePeriodDays,
      noticeGivenAt: lease.noticeGivenAt,
      noticeByParty: lease.noticeByParty,
      noticeEffectiveDate: lease.noticeEffectiveDate,
      property: {
        id: lease.property.id,
        name: lease.property.name,
        address: lease.property.address,
        type: lease.property.type,
        photos: lease.property.documents.map((d) => `/api/files/${d.id}`),
      },
      landlord: lease.landlord,
    },
  });
}
