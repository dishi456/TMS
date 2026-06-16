import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guest polls their thread (token in the URL identifies them — no login).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inquiry = await prisma.propertyInquiry.findUnique({
    where: { token },
    include: { property: { select: { name: true } } },
  });
  if (!inquiry) return new Response("Not found", { status: 404 });

  await prisma.inquiryMessage.updateMany({ where: { inquiryId: inquiry.id, fromGuest: false, readByGuest: false }, data: { readByGuest: true } });

  const landlord = await prisma.user.findUnique({ where: { id: inquiry.landlordId }, select: { fullName: true, lastSeenAt: true } });
  const online = !!landlord?.lastSeenAt && Date.now() - new Date(landlord.lastSeenAt).getTime() < 60_000;
  const messages = await prisma.inquiryMessage.findMany({
    where: { inquiryId: inquiry.id },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, fromGuest: true, body: true, createdAt: true },
  });
  return Response.json({ messages, landlordName: landlord?.fullName ?? "Owner", propertyName: inquiry.property.name, online });
}

// Guest sends a message.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { body } = await req.json().catch(() => ({}));
  const text = String(body ?? "").trim();
  if (!text) return new Response("Empty", { status: 400 });

  const inquiry = await prisma.propertyInquiry.findUnique({
    where: { token },
    include: { property: { select: { name: true } } },
  });
  if (!inquiry) return new Response("Not found", { status: 404 });

  await prisma.inquiryMessage.create({ data: { inquiryId: inquiry.id, fromGuest: true, body: text.slice(0, 2000) } });
  await prisma.propertyInquiry.update({ where: { id: inquiry.id }, data: { updatedAt: new Date() } });
  await notify(inquiry.landlordId, {
    type: "inquiry",
    title: `New message from ${inquiry.guestName}`,
    body: text.length > 80 ? text.slice(0, 80) + "…" : text,
    link: `/landlord/inquiries/${inquiry.id}`,
  });
  return Response.json({ ok: true });
}
