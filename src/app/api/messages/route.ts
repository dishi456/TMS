import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 60_000;

// Confirm the two users are a landlord<->their-tenant pair.
async function relate(meId: string, otherId: string) {
  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: meId }, select: { id: true, role: true, landlordId: true, fullName: true } }),
    prisma.user.findUnique({ where: { id: otherId }, select: { id: true, role: true, landlordId: true, lastSeenAt: true } }),
  ]);
  if (!me || !other) return null;
  const ok =
    (me.role === "TENANT" && other.role === "LANDLORD" && me.landlordId === other.id) ||
    (me.role === "LANDLORD" && other.role === "TENANT" && other.landlordId === me.id);
  return ok ? { me, other } : null;
}

// Poll: returns the thread + the other party's online status. Doubles as a
// heartbeat (updates my lastSeenAt) and marks the other party's msgs read.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const meId = session.user.id;
  const otherId = new URL(req.url).searchParams.get("with") ?? "";
  const rel = await relate(meId, otherId);
  if (!rel) return new Response("Forbidden", { status: 403 });

  await prisma.user.update({ where: { id: meId }, data: { lastSeenAt: new Date() } });
  await prisma.message.updateMany({ where: { senderId: otherId, recipientId: meId, read: false }, data: { read: true } });

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: meId, recipientId: otherId }, { senderId: otherId, recipientId: meId }] },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, senderId: true, body: true, createdAt: true },
  });
  const lastSeenAt = rel.other.lastSeenAt;
  const online = !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
  return Response.json({ messages, online, lastSeenAt });
}

// Send a message.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const meId = session.user.id;
  const { recipientId, body } = await req.json().catch(() => ({}));
  const text = String(body ?? "").trim();
  if (!recipientId || !text) return new Response("Bad request", { status: 400 });
  const rel = await relate(meId, recipientId);
  if (!rel) return new Response("Forbidden", { status: 403 });

  await prisma.user.update({ where: { id: meId }, data: { lastSeenAt: new Date() } });
  await prisma.message.create({ data: { senderId: meId, recipientId, body: text.slice(0, 2000) } });
  await notify(recipientId, {
    type: "message",
    title: `New message from ${rel.me.fullName}`,
    body: text.length > 80 ? text.slice(0, 80) + "…" : text,
    link: rel.other.role === "TENANT" ? "/tenant/messages" : `/landlord/messages/${meId}`,
  });
  return Response.json({ ok: true });
}
