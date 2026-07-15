import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/mobile-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const schema = z.object({
  email: z.string().min(3),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

// POST /api/mobile/v1/auth/reset  { email, code, newPassword } -> { ok:true }
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const { email, code, newPassword } = parsed.data;

  // Cap code-guessing: 6 attempts per email + per IP per 15 minutes.
  const mailKey = email.trim().toLowerCase();
  if (!rateLimit(`reset:${mailKey}`, 6, 15 * 60 * 1000).ok || !rateLimit(`reset-ip:${clientIp(req)}`, 20, 15 * 60 * 1000).ok) {
    return json({ error: "Too many attempts. Please request a new code and try again later." }, 429);
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return json({ error: "Invalid or expired code." }, 400);

  const rec = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, tokenHash: sha256(`${user.id}:${code}`), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!rec) return json({ error: "Invalid or expired code." }, 400);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  await prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return json({ ok: true });
}
