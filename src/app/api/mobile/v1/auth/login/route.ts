import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken, json } from "@/lib/mobile-auth";
import { consumeVerifyToken } from "@/lib/otp";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/auth/login  { email, password, otp? } -> { token, user }
export async function POST(req: Request) {
  // Throttle password guessing: 10 attempts per IP per 5 minutes.
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 5 * 60 * 1000);
  if (!rl.ok) return json({ error: "Too many attempts. Please wait a minute and try again." }, 429);

  const { email, password, otp } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  const pass = String(password ?? "");
  if (!mail || !pass) return json({ error: "Email and password are required." }, 400);

  const user = await prisma.user.findUnique({ where: { email: mail } });
  if (!user || user.status === "SUSPENDED") return json({ error: "Invalid email or password." }, 401);

  const ok = await bcrypt.compare(pass, user.passwordHash);
  if (!ok) return json({ error: "Invalid email or password." }, 401);

  // Optional 2nd factor (only when AUTH_LOGIN_OTP=on; app must call /auth/otp first).
  if (process.env.AUTH_LOGIN_OTP === "on") {
    const okOtp = await consumeVerifyToken(mail, String(otp ?? ""), "login");
    if (!okOtp) return json({ error: "Email OTP required (AUTH_LOGIN_OTP is on)." }, 401);
  }

  const token = await signMobileToken({ id: user.id, role: user.role });
  return json({
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status },
  });
}
