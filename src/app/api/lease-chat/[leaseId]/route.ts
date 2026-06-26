import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { isOnline, leaseNumber } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

// A lease is only chattable by its own tenant/landlord pair.
async function loadLease(leaseId: string, userId: string) {
  return prisma.lease.findFirst({
    where: { id: leaseId, OR: [{ tenantId: userId }, { landlordId: userId }] },
    include: {
      property: { select: { id: true, name: true, documents: { where: { type: "PHOTO" }, take: 1, orderBy: { createdAt: "asc" }, select: { id: true } } } },
      tenant: { select: { id: true, fullName: true, avatarUrl: true, lastSeenAt: true } },
      landlord: { select: { id: true, fullName: true, avatarUrl: true, lastSeenAt: true } },
    },
  });
}

// GET /api/lease-chat/{leaseId} -> conversation header + messages.
// Marks the other party's messages as read and touches my presence heartbeat.
export async function GET(_req: Request, ctx: { params: Promise<{ leaseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  const userId = session.user.id;
  const { leaseId } = await ctx.params;
  const lease = await loadLease(leaseId, userId);
  if (!lease) return json({ error: "Conversation not found." }, 404);

  await prisma.leaseMessage.updateMany({ where: { leaseId, readAt: null, NOT: { senderId: userId } }, data: { readAt: new Date() } });
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});

  const messages = await prisma.leaseMessage.findMany({
    where: { leaseId },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, body: true, attachmentUrl: true, attachmentType: true, readAt: true, createdAt: true, senderId: true },
  });
  const iAmTenant = lease.tenantId === userId;
  const other = iAmTenant ? lease.landlord : lease.tenant;
  return json({
    conversation: {
      leaseId: lease.id,
      leaseNumber: leaseNumber(lease.id),
      leaseStatus: lease.status,
      rent: Number(lease.monthlyRent),
      property: { id: lease.property.id, name: lease.property.name, photo: lease.property.documents[0] ? `/api/files/${lease.property.documents[0].id}` : null },
      other: { id: other.id, name: other.fullName, avatarUrl: other.avatarUrl, online: isOnline(other.lastSeenAt) },
      signedContractUrl: lease.signedContractUrl,
    },
    messages: messages.map((m) => ({ ...m, mine: m.senderId === userId })),
  });
}

const sendSchema = z
  .object({
    body: z.string().trim().max(4000).optional(),
    attachmentUrl: z.string().regex(/^\/api\/files\/[a-zA-Z0-9]+$/, "Invalid attachment.").optional(),
    attachmentType: z.enum(["image", "pdf", "file"]).optional(),
  })
  .refine((d) => (d.body && d.body.length > 0) || d.attachmentUrl, { message: "Empty message." });

// POST /api/lease-chat/{leaseId} -> send a message (text and/or one attachment).
export async function POST(req: Request, ctx: { params: Promise<{ leaseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  const userId = session.user.id;
  const { leaseId } = await ctx.params;
  const lease = await loadLease(leaseId, userId);
  if (!lease) return json({ error: "Conversation not found." }, 404);

  const parsed = sendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  // An attached file must be one the sender actually uploaded.
  if (d.attachmentUrl) {
    const docId = d.attachmentUrl.split("/").pop()!;
    const owns = await prisma.document.findFirst({ where: { id: docId, ownerId: userId }, select: { id: true } });
    if (!owns) return json({ error: "Attachment not found." }, 400);
  }

  const msg = await prisma.leaseMessage.create({
    data: { leaseId, senderId: userId, body: d.body || null, attachmentUrl: d.attachmentUrl || null, attachmentType: d.attachmentType || null },
    select: { id: true, body: true, attachmentUrl: true, attachmentType: true, readAt: true, createdAt: true, senderId: true },
  });
  await prisma.lease.update({ where: { id: leaseId }, data: { updatedAt: new Date() } }).catch(() => {});
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});

  const isTenant = lease.tenantId === userId;
  const otherId = isTenant ? lease.landlordId : lease.tenantId;
  await notify(otherId, {
    type: "chat",
    title: `New message · ${lease.property.name}`,
    body: d.body ? d.body.slice(0, 80) : "Sent an attachment",
    link: isTenant ? `/landlord/chat/${leaseId}` : `/tenant/chat/${leaseId}`,
  });

  return json({ ok: true, message: { ...msg, mine: true } });
}
