import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/inquiries → property enquiry inbox.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  const inquiries = await prisma.propertyInquiry.findMany({
    where: { landlordId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true, token: true, guestName: true, guestPhone: true, updatedAt: true,
      property: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromGuest: true, createdAt: true } },
      _count: { select: { messages: { where: { fromGuest: true, readByLandlord: false } } } },
    },
  });

  return json({
    items: inquiries.map((i) => ({
      id: i.id,
      token: i.token,
      guestName: i.guestName,
      guestPhone: i.guestPhone,
      property: i.property.name,
      updatedAt: i.updatedAt.toISOString(),
      unread: i._count.messages,
      lastMessage: i.messages[0] ? { body: i.messages[0].body, fromGuest: i.messages[0].fromGuest } : null,
    })),
  });
}
