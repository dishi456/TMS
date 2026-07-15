import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/notifications/read  { id? } -> mark one (id) or all read
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const { id } = await req.json().catch(() => ({}));
  if (id) {
    await prisma.notification.updateMany({ where: { id: String(id), userId: user.id }, data: { read: true } });
  } else {
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  }
  return json({ ok: true });
}
