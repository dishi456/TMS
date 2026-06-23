import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/account/enquiries → the signed-in USER's property enquiries.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["USER"]);
  if (user instanceof Response) return user;

  const inquiries = await prisma.propertyInquiry.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      token: true,
      createdAt: true,
      updatedAt: true,
      property: {
        select: {
          id: true,
          ref: true,
          name: true,
          address: true,
          documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, fromGuest: true, createdAt: true, readByGuest: true },
      },
      _count: { select: { messages: { where: { fromGuest: false, readByGuest: false } } } },
    },
  });

  return json({
    items: inquiries.map((i) => ({
      token: i.token,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      unread: i._count.messages,
      lastMessage: i.messages[0]
        ? { body: i.messages[0].body, fromGuest: i.messages[0].fromGuest, createdAt: i.messages[0].createdAt.toISOString() }
        : null,
      property: {
        id: i.property.id,
        ref: i.property.ref,
        name: i.property.name,
        address: i.property.address,
        photo: i.property.documents[0] ? `/api/files/${i.property.documents[0].id}` : null,
      },
    })),
  });
}
