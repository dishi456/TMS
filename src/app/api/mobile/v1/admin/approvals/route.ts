import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/approvals → pending landlords + pending properties.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;

  const [landlords, properties] = await Promise.all([
    prisma.user.findMany({
      where: { role: "LANDLORD", status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, phone: true, createdAt: true },
    }),
    prisma.property.findMany({
      where: { approved: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, address: true, ref: true, createdAt: true,
        landlord: { select: { fullName: true } },
        documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
      },
    }),
  ]);

  return json({
    landlords: landlords.map((l) => ({ id: l.id, fullName: l.fullName, email: l.email, phone: l.phone, createdAt: l.createdAt.toISOString() })),
    properties: properties.map((p) => ({
      id: p.id, name: p.name, address: p.address, ref: p.ref,
      landlord: p.landlord.fullName, createdAt: p.createdAt.toISOString(),
      photo: p.documents[0] ? `/api/files/${p.documents[0].id}` : null,
    })),
  });
}
