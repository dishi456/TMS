import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/inquiries -> guest/user inquiries for this landlord
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const items = await prisma.propertyInquiry.findMany({
    where: { landlordId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      property: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromGuest: true, createdAt: true } },
      _count: { select: { messages: { where: { fromGuest: true, readByLandlord: false } } } },
    },
  });
  return json({
    inquiries: items.map((i) => ({
      id: i.id, guestName: i.guestName, guestPhone: i.guestPhone, guestEmail: i.guestEmail,
      property: i.property, lastMessage: i.messages[0] ?? null, unread: i._count.messages, updatedAt: i.updatedAt,
    })),
  });
}
