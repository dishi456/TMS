import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";

// Create an in-app notification for a user and fan it out to web push.
// Best-effort: a failure here must never break the action that triggered it.
export async function notify(
  userId: string | null | undefined,
  n: { type: string; title: string; body?: string; link?: string },
): Promise<void> {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: { userId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null },
    });
    // Fan out to the user's devices via web push (no-op if push isn't configured).
    await sendPush(userId, { title: n.title, body: n.body, url: n.link ?? "/" });
  } catch (e) {
    console.error("notify failed:", e);
  }
}
