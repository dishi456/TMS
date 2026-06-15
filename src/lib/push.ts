import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let configured = false;
try {
  if (PUBLIC && PRIVATE) {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
  }
} catch (e) {
  console.error("web-push VAPID setup failed:", e);
}

export function pushConfigured(): boolean {
  return configured;
}

export type PushPayload = { title: string; body?: string; url?: string };

// Best-effort web push to all of a user's registered devices. Never throws.
export async function sendPush(userId: string | null | undefined, payload: PushPayload): Promise<void> {
  if (!configured || !userId) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        // 404/410 = subscription expired or unsubscribed → clean it up.
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error("sendPush failed:", code ?? e);
        }
      }
    }),
  );
}
