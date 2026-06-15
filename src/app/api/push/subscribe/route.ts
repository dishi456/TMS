import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save (or refresh) the current user's push subscription.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const sub = await req.json().catch(() => null);
  const endpoint = sub?.endpoint as string | undefined;
  const p256dh = sub?.keys?.p256dh as string | undefined;
  const authKey = sub?.keys?.auth as string | undefined;
  if (!endpoint || !p256dh || !authKey) return new Response("Bad subscription", { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.user.id, p256dh, auth: authKey },
    create: { userId: session.user.id, endpoint, p256dh, auth: authKey },
  });
  return Response.json({ ok: true });
}

// Remove a subscription (on unsubscribe).
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const sub = await req.json().catch(() => null);
  const endpoint = sub?.endpoint as string | undefined;
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });
  return Response.json({ ok: true });
}
