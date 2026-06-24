import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/account/enquiries -> the signed-in user's property inquiries.
// (Open a thread's messages via GET /api/inquiries/{token}.)
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const inquiries = await prisma.propertyInquiry.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      property: { select: { id: true, name: true, ref: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromGuest: true, createdAt: true } },
    },
  });
  return json({
    inquiries: inquiries.map((i) => ({
      id: i.id, token: i.token, property: i.property,
      lastMessage: i.messages[0] ?? null, updatedAt: i.updatedAt,
    })),
  });
}
