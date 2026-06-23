import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/properties → the landlord's properties.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  const props = await prisma.property.findMany({
    where: { landlordId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
      leases: { where: { status: { in: ["ACTIVE", "RENEWED"] } }, select: { tenant: { select: { fullName: true } } } },
    },
  });

  return json({
    items: props.map((p) => ({
      id: p.id,
      ref: p.ref,
      name: p.name,
      address: p.address,
      type: p.type,
      rent: Number(p.rentAmount),
      availability: p.availability,
      approved: p.approved,
      verified: p.verified,
      listedPublic: p.listedPublic,
      photo: p.documents[0] ? `/api/files/${p.documents[0].id}` : null,
      tenants: p.leases.map((l) => l.tenant.fullName),
    })),
  });
}
