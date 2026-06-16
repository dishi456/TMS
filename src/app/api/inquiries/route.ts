import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notify } from "@/lib/notify";
import { consumeVerifyToken } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Start a chat with a property's owner. A signed-in user is already trusted
// (verified email) — anonymous visitors must verify their email via OTP first.
export async function POST(req: Request) {
  const { propertyId, name, phone, email, message, otpToken } = await req.json().catch(() => ({}));
  const session = await auth();
  const viewer = session?.user
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, fullName: true, email: true, phone: true } })
    : null;

  const guestName = (viewer?.fullName || String(name ?? "")).trim();
  const guestPhone = String(phone ?? viewer?.phone ?? "").trim();
  const guestEmail = (viewer?.email || String(email ?? "")).trim();
  const firstMessage = String(message ?? "").trim();
  if (!propertyId || guestName.length < 2 || guestPhone.length < 5) {
    return new Response("Name and phone are required.", { status: 400 });
  }
  if (!guestEmail) return new Response("Email is required.", { status: 400 });

  // Signed-in users skip OTP; anonymous visitors need a verified-email token.
  if (!viewer) {
    const verified = await consumeVerifyToken(guestEmail, String(otpToken ?? ""), "chat");
    if (!verified) return new Response("Please verify your email before starting a chat.", { status: 403 });
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, approved: true, listedPublic: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return new Response("Property not available.", { status: 404 });

  const inquiry = await prisma.propertyInquiry.create({
    data: {
      propertyId: property.id,
      landlordId: property.landlordId,
      guestName,
      guestPhone,
      guestEmail,
      userId: viewer?.id ?? null,
      messages: {
        create: firstMessage
          ? [{ fromGuest: true, body: firstMessage.slice(0, 2000) }]
          : [{ fromGuest: true, body: `Hi, I'm interested in ${property.name}.` }],
      },
    },
  });

  await notify(property.landlordId, {
    type: "inquiry",
    title: "New property enquiry",
    body: `${guestName} (${guestPhone}) messaged about ${property.name}.`,
    link: `/landlord/inquiries/${inquiry.id}`,
  });

  return Response.json({ token: inquiry.token });
}
