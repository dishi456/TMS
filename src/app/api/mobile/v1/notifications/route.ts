import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/notifications -> the user's notifications + unread count
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, type: true, title: true, body: true, link: true, read: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return json({ notifications: items, unread });
}
