import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/tenants/{id} -> tenant profile + full rental
// history (everywhere they've lived) + reviews about them + blacklist status.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;

  // A tenant "belongs" to this landlord if directly linked or they share a lease.
  const tenant = await prisma.user.findFirst({
    where: { id, role: "TENANT", OR: [{ landlordId: user.id }, { tenantLeases: { some: { landlordId: user.id } } }] },
    select: { id: true, fullName: true, email: true, phone: true, verified: true, governmentId: true, emergencyContact: true, avatarUrl: true, username: true },
  });
  if (!tenant) return json({ error: "Not found." }, 404);

  // Full rental history across ALL landlords (for vetting), newest first.
  const leases = await prisma.lease.findMany({
    where: { tenantId: id },
    orderBy: { startDate: "desc" },
    include: {
      property: { select: { id: true, name: true, address: true, city: true } },
      landlord: { select: { id: true, fullName: true } },
    },
  });

  // Public reviews about the tenant (landlord -> tenant, VISIBLE).
  const reviews = await prisma.rating.findMany({
    where: { rateeId: id, direction: "LANDLORD_TO_TENANT", status: "VISIBLE" },
    orderBy: { createdAt: "desc" },
    include: { rater: { select: { fullName: true } }, lease: { select: { property: { select: { name: true } } } } },
  });

  const blacklist = await prisma.blacklist.findUnique({ where: { landlordId_tenantId: { landlordId: user.id, tenantId: id } }, select: { reason: true, createdAt: true } });

  // The tenant's uploaded identity documents, so the landlord can review + verify.
  const docs = await prisma.document.findMany({
    where: { ownerId: id, type: { in: ["GOVERNMENT_ID", "OTHER"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, docNumber: true, expiryDate: true, verified: true, contentType: true, createdAt: true },
  });
  const mask = (n: string | null) => (!n ? null : n.length <= 4 ? n : `•••• ${n.slice(-4)}`);

  const agg = await prisma.rating.aggregate({ where: { rateeId: id, direction: "LANDLORD_TO_TENANT", status: "VISIBLE" }, _avg: { stars: true }, _count: { _all: true } });

  return json({
    tenant,
    rating: agg._avg.stars != null ? Math.round(agg._avg.stars * 10) / 10 : null,
    ratingCount: agg._count._all,
    blacklist: blacklist ? { reason: blacklist.reason, createdAt: blacklist.createdAt } : null,
    leases: leases.map((l) => ({
      id: l.id, status: l.status, monthlyRent: Number(l.monthlyRent), startDate: l.startDate, endDate: l.endDate,
      property: l.property, landlord: l.landlord, mine: l.landlordId === user.id,
    })),
    reviews: reviews.map((r) => ({ id: r.id, stars: r.stars, feedback: r.feedback, recommend: r.recommend, by: r.rater.fullName, property: r.lease?.property?.name ?? null, createdAt: r.createdAt })),
    documents: docs.map((d) => ({
      id: d.id,
      type: d.label || "Document",
      numberMasked: mask(d.docNumber),
      expiryDate: d.expiryDate,
      verified: d.verified,
      verificationStatus: d.verified ? "VERIFIED" : "PENDING",
      isImage: (d.contentType || "").startsWith("image/"),
      url: `/api/files/${d.id}`,
      createdAt: d.createdAt,
    })),
  });
}
