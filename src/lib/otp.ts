import { createHash, randomInt, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, APP_NAME } from "@/lib/email";

export type OtpPurpose = "chat" | "register" | "login" | "reset";

const CODE_TTL_MIN = 10; // code valid for 10 minutes
const RESEND_COOLDOWN_SEC = 30; // min gap between sends to the same address
const MAX_ATTEMPTS = 5; // wrong guesses before the code is burned

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const normEmail = (e: string) => e.trim().toLowerCase();

export type SendResult = { ok: true } | { ok: false; error: string };

// Generate a 6-digit code, store its hash, and email it to the address.
export async function sendOtp(rawEmail: string, purpose: OtpPurpose): Promise<SendResult> {
  const email = normEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };

  // Cooldown: refuse if we just sent one to this address for this purpose.
  const recent = await prisma.emailOtp.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const ageSec = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (ageSec < RESEND_COOLDOWN_SEC) {
      return { ok: false, error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - ageSec)}s before requesting another code.` };
    }
  }

  // Invalidate any earlier un-consumed codes for this email+purpose.
  await prisma.emailOtp.deleteMany({ where: { email, purpose, consumedAt: null } });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // Dev convenience: surface the code in the server log so demo accounts with
  // placeholder emails can still be tested. Never runs in production.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[otp:dev] ${purpose} code for ${email} → ${code}\n`);
  }

  await prisma.emailOtp.create({
    data: {
      email,
      purpose,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
    },
  });

  await sendEmail({
    to: email,
    subject: `${APP_NAME} verification code: ${code}`,
    html: emailLayout(
      "Your verification code",
      `<p>Use this code to ${purpose === "login" ? "sign in" : purpose === "register" ? "verify your email" : purpose === "reset" ? "reset your password" : "start your chat"}:</p>
       <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#2563eb;margin:16px 0">${code}</p>
       <p style="color:#64748b;font-size:13px">This code expires in ${CODE_TTL_MIN} minutes. If you didn't request it, you can ignore this email.</p>`,
    ),
  });

  return { ok: true };
}

export type VerifyResult = { ok: true; verifyToken: string } | { ok: false; error: string };

// Check a submitted code. On success, issue a one-time verifyToken the caller
// presents when performing the real action (redeemed via consumeVerifyToken).
export async function verifyOtp(rawEmail: string, rawCode: string, purpose: OtpPurpose): Promise<VerifyResult> {
  const email = normEmail(rawEmail);
  const code = String(rawCode ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code." };

  const otp = await prisma.emailOtp.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, error: "No code found — request a new one." };
  if (otp.expiresAt.getTime() < Date.now()) return { ok: false, error: "Code expired — request a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many attempts — request a new code." };

  if (otp.codeHash !== sha256(code)) {
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Incorrect code. Please try again." };
  }

  const verifyToken = randomBytes(24).toString("hex");
  await prisma.emailOtp.update({ where: { id: otp.id }, data: { verified: true, verifyToken } });
  return { ok: true, verifyToken };
}

// Server-side gate for the real action: confirms the email was OTP-verified and
// burns the token so it can't be reused. Returns true only once per token.
export async function consumeVerifyToken(rawEmail: string, verifyToken: string, purpose: OtpPurpose): Promise<boolean> {
  const email = normEmail(rawEmail);
  if (!verifyToken) return false;

  const otp = await prisma.emailOtp.findUnique({ where: { verifyToken } });
  if (!otp) return false;
  if (otp.email !== email || otp.purpose !== purpose) return false;
  if (!otp.verified || otp.consumedAt) return false;
  if (otp.expiresAt.getTime() < Date.now()) return false;

  await prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return true;
}
