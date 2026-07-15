import { prisma } from "@/lib/prisma";

// "Online" if the user's presence heartbeat fired in the last 30s.
export const ONLINE_WINDOW_MS = 30_000;
export function isOnline(lastSeenAt: Date | null | undefined): boolean {
  return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export function leaseNumber(id: string): string {
  return `LEASE-${id.slice(-6).toUpperCase()}`;
}

export type Conversation = {
  leaseId: string;
  leaseNumber: string;
  leaseStatus: string;
  rent: number;
  property: { id: string; name: string; photo: string | null };
  other: { id: string; name: string; avatarUrl: string | null; online: boolean };
  lastMessage: { body: string | null; attachmentType: string | null; createdAt: Date; mine: boolean } | null;
  unread: number;
};

// One conversation per lease the user (tenant or landlord) is part of, ordered
// by most-recent activity, with last message + unread count. Mirrors the mobile
// /chat/conversations endpoint so web and mobile stay in lock-step.
export async function listConversations(userId: string): Promise<Conversation[]> {
  const leases = await prisma.lease.findMany({
    where: { OR: [{ tenantId: userId }, { landlordId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } },
        },
      },
      tenant: { select: { id: true, fullName: true, avatarUrl: true, lastSeenAt: true } },
      landlord: { select: { id: true, fullName: true, avatarUrl: true, lastSeenAt: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, attachmentType: true, createdAt: true, senderId: true } },
    },
  });

  const unread = await prisma.leaseMessage.groupBy({
    by: ["leaseId"],
    where: { lease: { OR: [{ tenantId: userId }, { landlordId: userId }] }, readAt: null, NOT: { senderId: userId } },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((u) => [u.leaseId, u._count._all]));

  return leases.map((l) => {
    const iAmTenant = l.tenantId === userId;
    const other = iAmTenant ? l.landlord : l.tenant;
    const last = l.messages[0];
    return {
      leaseId: l.id,
      leaseNumber: leaseNumber(l.id),
      leaseStatus: l.status,
      rent: Number(l.monthlyRent),
      property: { id: l.property.id, name: l.property.name, photo: l.property.documents[0] ? `/api/files/${l.property.documents[0].id}` : null },
      other: { id: other.id, name: other.fullName, avatarUrl: other.avatarUrl, online: isOnline(other.lastSeenAt) },
      lastMessage: last ? { body: last.body, attachmentType: last.attachmentType, createdAt: last.createdAt, mine: last.senderId === userId } : null,
      unread: unreadMap.get(l.id) ?? 0,
    };
  });
}

export type ConversationHeader = {
  leaseId: string;
  leaseNumber: string;
  leaseStatus: string;
  rent: number;
  property: { name: string; photo: string | null };
  other: { name: string; online: boolean };
  signedContractUrl: string | null;
};

// Header for a single conversation, scoped to a lease the user is part of.
// Returns null if the lease doesn't exist or the user isn't a party to it.
export async function getConversationHeader(leaseId: string, userId: string): Promise<ConversationHeader | null> {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, OR: [{ tenantId: userId }, { landlordId: userId }] },
    include: {
      property: { select: { name: true, documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } } } },
      tenant: { select: { fullName: true, lastSeenAt: true } },
      landlord: { select: { fullName: true, lastSeenAt: true } },
    },
  });
  if (!lease) return null;
  const other = lease.tenantId === userId ? lease.landlord : lease.tenant;
  return {
    leaseId: lease.id,
    leaseNumber: leaseNumber(lease.id),
    leaseStatus: lease.status,
    rent: Number(lease.monthlyRent),
    property: { name: lease.property.name, photo: lease.property.documents[0] ? `/api/files/${lease.property.documents[0].id}` : null },
    other: { name: other.fullName, online: isOnline(other.lastSeenAt) },
    signedContractUrl: lease.signedContractUrl,
  };
}

// Total unread lease-chat messages across all of the user's conversations —
// used for the nav badge.
export async function chatUnreadCount(userId: string): Promise<number> {
  return prisma.leaseMessage.count({
    where: { lease: { OR: [{ tenantId: userId }, { landlordId: userId }] }, readAt: null, NOT: { senderId: userId } },
  });
}
