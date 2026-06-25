import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// GET /api/mobile/v1/chat/{leaseId} -> conversation header + messages (marks
// the other party's messages as read; touches my presence).
export async function GET(req: Request, ctx: { params: Promise<{ leaseId: string }> }) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { leaseId } = await ctx.params;
  const lease = await loadLease(leaseId, user.id);
  if (!lease) return json({ error: "Conversation not found." }, 404);

  await prisma.leaseMessage.updateMany({ where: { leaseId, readAt: null, NOT: { senderId: user.id } }, data: { readAt: new Date() } });
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});

  const messages = await prisma.leaseMessage.findMany({
    where: { leaseId },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, body: true, attachmentUrl: true, attachmentType: true, starred: true, readAt: true, createdAt: true, senderId: true },
  });
  const iAmTenant = lease.tenantId === user.id;
  const other = iAmTenant ? lease.landlord : lease.tenant;
  return json({
    conversation: {
      leaseId: lease.id, leaseNumber: `LEASE-${lease.id.slice(-6).toUpperCase()}`, leaseStatus: lease.status, rent: Number(lease.monthlyRent),
      property: { id: lease.property.id, name: lease.property.name, photo: lease.property.documents[0] ? `/api/files/${lease.property.documents[0].id}` : null },
      tenantName: lease.tenant.fullName, landlordName: lease.landlord.fullName,
      other: { id: other.id, name: other.fullName, avatarUrl: other.avatarUrl, lastSeenAt: other.lastSeenAt },
      signedContractUrl: lease.signedContractUrl,
    },
    messages: messages.map((m) => ({ ...m, mine: m.senderId === user.id })),
  });
}

const sendSchema = z.object({
  body: z.string().trim().optional(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.enum(["image", "pdf", "file"]).optional(),
}).refine((d) => (d.body && d.body.length > 0) || d.attachmentUrl, { message: "Empty message." });

// POST /api/mobile/v1/chat/{leaseId} -> send a message
export async function POST(req: Request, ctx: { params: Promise<{ leaseId: string }> }) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { leaseId } = await ctx.params;
  const lease = await loadLease(leaseId, user.id);
  if (!lease) return json({ error: "Conversation not found." }, 404);
  const parsed = sendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  const msg = await prisma.leaseMessage.create({
    data: { leaseId, senderId: user.id, body: d.body || null, attachmentUrl: d.attachmentUrl || null, attachmentType: d.attachmentType || null },
    select: { id: true, body: true, attachmentUrl: true, attachmentType: true, starred: true, readAt: true, createdAt: true, senderId: true },
  });
  await prisma.lease.update({ where: { id: leaseId }, data: { updatedAt: new Date() } }).catch(() => {});
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});

  const otherId = lease.tenantId === user.id ? lease.landlordId : lease.tenantId;
  const isTenant = lease.tenantId === user.id;
  await notify(otherId, {
    type: "chat", title: `New message · ${lease.property.name}`,
    body: d.body ? d.body.slice(0, 80) : "Sent an attachment",
    link: isTenant ? `/landlord/chat/${leaseId}` : `/tenant/chat/${leaseId}`,
  });
  return json({ ok: true, message: { ...msg, mine: true } });
}
