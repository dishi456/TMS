import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function own(meId: string, id: string) {
  return prisma.propertyInquiry.findFirst({
    where: { id, landlordId: meId },
    include: { property: { select: { name: true } } },
  });
}

// Landlord polls a guest inquiry thread.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const inquiry = await own(session.user.id, id);
  if (!inquiry) return new Response("Forbidden", { status: 403 });

  // Heartbeat: marks the landlord "online" to the guest while they view the chat.
  await prisma.user.update({ where: { id: session.user.id }, data: { lastSeenAt: new Date() } });
  await prisma.inquiryMessage.updateMany({ where: { inquiryId: id, fromGuest: true, readByLandlord: false }, data: { readByLandlord: true } });

  const messages = await prisma.inquiryMessage.findMany({
    where: { inquiryId: id },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, fromGuest: true, body: true, createdAt: true },
  });
  return Response.json({ messages });
}

// Landlord replies to a guest.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const inquiry = await own(session.user.id, id);
  if (!inquiry) return new Response("Forbidden", { status: 403 });

  const { body } = await req.json().catch(() => ({}));
  const text = String(body ?? "").trim();
  if (!text) return new Response("Empty", { status: 400 });

  await prisma.inquiryMessage.create({ data: { inquiryId: id, fromGuest: false, body: text.slice(0, 2000) } });
  await prisma.propertyInquiry.update({ where: { id }, data: { updatedAt: new Date() } });
  return Response.json({ ok: true });
}
