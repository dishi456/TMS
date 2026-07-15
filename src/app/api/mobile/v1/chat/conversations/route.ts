import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/chat/conversations -> one conversation per lease the
// caller (tenant or landlord) is part of, with last message + unread count.
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req);
  if (res) return res;

  const leases = await prisma.lease.findMany({
    where: { OR: [{ tenantId: user.id }, { landlordId: user.id }] },
    orderBy: { updatedAt: "desc" },
    include: {
      property: { select: { id: true, name: true, documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } } } },
      tenant: { select: { id: true, fullName: true, avatarUrl: true, lastSeenAt: true } },
      landlord: { select: { id: true, fullName: true, avatarUrl: true, lastSeenAt: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, attachmentType: true, createdAt: true, senderId: true } },
    },
  });

  const unread = await prisma.leaseMessage.groupBy({
    by: ["leaseId"],
    where: { lease: { OR: [{ tenantId: user.id }, { landlordId: user.id }] }, readAt: null, NOT: { senderId: user.id } },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((u) => [u.leaseId, u._count._all]));

  const conversations = leases.map((l) => {
    const iAmTenant = l.tenantId === user.id;
    const other = iAmTenant ? l.landlord : l.tenant;
    const last = l.messages[0];
    return {
      leaseId: l.id,
      leaseNumber: `LEASE-${l.id.slice(-6).toUpperCase()}`,
      leaseStatus: l.status,
      rent: Number(l.monthlyRent),
      property: { id: l.property.id, name: l.property.name, photo: l.property.documents[0] ? `/api/files/${l.property.documents[0].id}` : null },
      other: { id: other.id, name: other.fullName, avatarUrl: other.avatarUrl, lastSeenAt: other.lastSeenAt },
      lastMessage: last ? { body: last.body, attachmentType: last.attachmentType, createdAt: last.createdAt, mine: last.senderId === user.id } : null,
      unread: unreadMap.get(l.id) ?? 0,
    };
  });
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);
  return json({ conversations, totalUnread });
}
