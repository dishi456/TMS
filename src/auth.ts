import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { consumeVerifyToken } from "@/lib/otp";

// Two-factor email OTP at login is opt-in (set AUTH_LOGIN_OTP=on). Off by
// default so password login works out of the box, including demo accounts.
export const LOGIN_OTP_ENABLED = process.env.AUTH_LOGIN_OTP === "on";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().optional(), // one-time verifyToken from the email-OTP step (when enabled)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, otp: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        // PENDING users may sign in (they land on the onboarding/verification
        // screen); only SUSPENDED users are denied access.
        if (!user || user.status === "SUSPENDED") return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        // When enabled, enforce the email OTP — the token was issued only after
        // a prior password check, and is burned here so it can't be reused.
        if (LOGIN_OTP_ENABLED) {
          const otpOk = await consumeVerifyToken(parsed.data.email, parsed.data.otp ?? "", "login");
          if (!otpOk) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],
});
