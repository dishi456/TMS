import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeVerifyToken } from "@/lib/otp";
import { signMobileToken, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().optional(), // verifyToken from email-OTP step (when AUTH_LOGIN_OTP=on)
});

// POST /api/mobile/v1/auth/login → { token, user }
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error("Email and password are required.", 400);
  const { email, password, otp } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // PENDING users may sign in; only SUSPENDED are denied. Use a generic message.
  if (!user || user.status === "SUSPENDED") return error("Invalid email or password.", 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return error("Invalid email or password.", 401);

  // Optional two-factor email OTP, mirroring the web (src/auth.ts).
  if (process.env.AUTH_LOGIN_OTP === "on") {
    const otpOk = await consumeVerifyToken(email, otp ?? "", "login");
    if (!otpOk) return error("Email verification required.", 401);
  }

  const token = signMobileToken(user.id, user.role);
  return json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}
