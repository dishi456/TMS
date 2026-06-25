import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/tenants/{id} -> tenant detail (must share a lease with this landlord)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  // A tenant "belongs" to this landlord if directly linked (landlordId) OR they
  // share a lease — matches the tenants-list query, so a just-added tenant (no
  // lease yet) still resolves here instead of 404-ing.
  const tenant = await prisma.user.findFirst({
    where: { id, role: "TENANT", OR: [{ landlordId: user.id }, { tenantLeases: { some: { landlordId: user.id } } }] },
    select: { id: true, fullName: true, email: true, phone: true, verified: true, governmentId: true, emergencyContact: true, avatarUrl: true },
  });
  if (!tenant) return json({ error: "Not found." }, 404);
  const leases = await prisma.lease.findMany({
    where: { tenantId: id, landlordId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, name: true } } },
  });
  return json({
    tenant,
    leases: leases.map((l) => ({ id: l.id, status: l.status, monthlyRent: Number(l.monthlyRent), startDate: l.startDate, endDate: l.endDate, property: l.property })),
  });
}
