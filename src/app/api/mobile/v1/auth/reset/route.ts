import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOtp, consumeVerifyToken } from "@/lib/otp";
import { json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

// POST /api/mobile/v1/auth/reset { email, code, newPassword } → { ok: true }
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const { email, code, newPassword } = parsed.data;
  const normEmail = email.toLowerCase();

  // Validate the 6-digit code (handles expiry + attempt limiting).
  const res = await verifyOtp(normEmail, code, "reset");
  if (!res.ok) return error(res.error, 400);

  const user = await prisma.user.findUnique({ where: { email: normEmail }, select: { id: true } });
  if (!user) return error("Account not found.", 404);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  // Burn the verified code so it can't be reused.
  await consumeVerifyToken(normEmail, res.verifyToken, "reset");

  return json({ ok: true });
}
