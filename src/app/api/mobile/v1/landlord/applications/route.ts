import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/applications -> rental applications for this landlord's properties
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const items = await prisma.application.findMany({
    where: { property: { landlordId: user.id } },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, name: true } } },
  });
  return json({ applications: items });
}
