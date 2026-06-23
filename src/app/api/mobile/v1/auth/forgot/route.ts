import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOtp } from "@/lib/otp";
import { json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/auth/forgot { email } → { ok: true }
// Emails a 6-digit reset code (rate-limited + attempt-capped by the OTP system).
// Always returns ok — never reveals whether an email is registered.
export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Enter a valid email.", 400);
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) await sendOtp(email, "reset");

  return json({ ok: true });
}
