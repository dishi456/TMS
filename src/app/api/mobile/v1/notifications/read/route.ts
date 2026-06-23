import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/notifications/read { id? } → mark one (or all) read.
export async function POST(req: Request) {
  const user = await requireMobileUser(req);
  if (user instanceof Response) return user;

  const parsed = z.object({ id: z.string().optional() }).safeParse(await req.json().catch(() => ({})));
  const id = parsed.success ? parsed.data.id : undefined;

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false, ...(id ? { id } : {}) },
    data: { read: true },
  });

  return json({ ok: true });
}
