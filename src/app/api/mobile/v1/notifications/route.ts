import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/notifications → the signed-in user's notifications.
export async function GET(req: Request) {
  const user = await requireMobileUser(req);
  if (user instanceof Response) return user;

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, type: true, title: true, body: true, link: true, read: true, createdAt: true },
  });

  return json({
    items: items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    unread: items.filter((n) => !n.read).length,
  });
}
