"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut, LOGIN_OTP_ENABLED } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendOtp, verifyOtp } from "@/lib/otp";

export type LoginState = { step: "credentials" | "otp"; email?: string; error?: string } | undefined;

const creds = z.object({ email: z.string().email(), password: z.string().min(1) });

// Two-phase login:
//   Phase 1 (no code): verify password, then email a one-time code.
//   Phase 2 (code present): verify the code, then sign in.
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  const parsed = creds.safeParse({ email, password });
  if (!parsed.success) return { step: "credentials", error: "Enter a valid email and password." };

  // Always re-check the password (covers phase 1 and resend).
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user && user.status !== "SUSPENDED" && (await bcrypt.compare(password, user.passwordHash));
  if (!passwordOk) return { step: "credentials", error: "Invalid email or password." };

  // OTP disabled → password is enough, sign in straight away.
  if (!LOGIN_OTP_ENABLED) {
    try {
      await signIn("credentials", { email, password, redirectTo: callbackUrl });
    } catch (error) {
      if (error instanceof AuthError) return { step: "credentials", error: "Could not sign you in. Please try again." };
      throw error; // re-throw the success redirect
    }
    return;
  }

  // ---- Phase 1: no code yet → email one ----
  if (!code) {
    const r = await sendOtp(email, "login");
    if (!r.ok) return { step: "credentials", error: r.error };
    return { step: "otp", email };
  }

  // ---- Phase 2: verify code, then sign in ----
  const v = await verifyOtp(email, code, "login");
  if (!v.ok) return { step: "otp", email, error: v.error };

  try {
    await signIn("credentials", { email, password, otp: v.verifyToken, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) return { step: "otp", email, error: "Could not sign you in. Please try again." };
    throw error; // re-throw the success redirect
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
