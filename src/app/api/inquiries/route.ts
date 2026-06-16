import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anonymous visitor starts a chat with a property's owner (name + phone only).
export async function POST(req: Request) {
  const { propertyId, name, phone, email, message } = await req.json().catch(() => ({}));
  const guestName = String(name ?? "").trim();
  const guestPhone = String(phone ?? "").trim();
  const firstMessage = String(message ?? "").trim();
  if (!propertyId || guestName.length < 2 || guestPhone.length < 5) {
    return new Response("Name and phone are required.", { status: 400 });
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
      guestEmail: email ? String(email).trim() : null,
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
