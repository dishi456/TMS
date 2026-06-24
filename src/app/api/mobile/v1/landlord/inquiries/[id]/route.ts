import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function own(landlordId: string, id: string) {
  return prisma.propertyInquiry.findFirst({ where: { id, landlordId } });
}

// GET /api/mobile/v1/landlord/inquiries/{id} -> thread (marks guest msgs read)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  if (!(await own(user.id, id))) return json({ error: "Not found." }, 404);
  await prisma.inquiryMessage.updateMany({ where: { inquiryId: id, fromGuest: true, readByLandlord: false }, data: { readByLandlord: true } });
  const messages = await prisma.inquiryMessage.findMany({
    where: { inquiryId: id }, orderBy: { createdAt: "asc" }, take: 300,
    select: { id: true, fromGuest: true, body: true, createdAt: true },
  });
  return json({ messages });
}

// POST /api/mobile/v1/landlord/inquiries/{id}  { body } -> reply to a guest
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  if (!(await own(user.id, id))) return json({ error: "Not found." }, 404);
  const { body } = await req.json().catch(() => ({}));
  const text = String(body ?? "").trim();
  if (!text) return json({ error: "Message is empty." }, 400);
  await prisma.inquiryMessage.create({ data: { inquiryId: id, fromGuest: false, body: text.slice(0, 2000) } });
  await prisma.propertyInquiry.update({ where: { id }, data: { updatedAt: new Date() } });
  return json({ ok: true });
}
