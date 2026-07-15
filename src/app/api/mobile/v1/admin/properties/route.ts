import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { serializeCard } from "@/lib/mobile-property";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/properties?status=pending|approved&q= -> all properties
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const where: Prisma.PropertyWhereInput = {
    ...(status === "pending" ? { approved: false } : status === "approved" ? { approved: true } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { address: { contains: q } }] } : {}),
  };
  const props = await prisma.property.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    include: {
      landlord: { select: { id: true, fullName: true } },
      documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
    },
  });
  return json({ properties: props.map((p) => ({ ...serializeCard(p), landlord: p.landlord })) });
}
