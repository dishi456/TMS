"use server";

import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";

export type ForgotState = { sent?: boolean; error?: string } | undefined;

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function requestReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const link = `${appUrl}/reset-password?token=${raw}`;
    await sendEmail({
      to: email,
      subject: "Reset your Lease Lord password",
      html: emailLayout(
        "Reset your password",
        `<p>We received a request to reset your password. This link expires in 1 hour.</p>
         <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
         <p style="font-size:12px;color:#64748b">If you didn't request this, you can ignore this email.</p>`,
      ),
    });
  }

  // Always return success — never reveal whether an email is registered.
  return { sent: true };
}
