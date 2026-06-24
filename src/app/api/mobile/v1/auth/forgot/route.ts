import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout, APP_NAME } from "@/lib/email";
import { json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// POST /api/mobile/v1/auth/forgot  { email } -> { ok:true } (always, to avoid leaking)
// Emails a 6-digit reset code (valid 1h). App then calls /auth/reset.
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();
  const user = mail ? await prisma.user.findUnique({ where: { email: mail } }) : null;

  if (user) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    // Scope the hash by userId so two users with the same code don't collide on the unique index.
    const tokenHash = sha256(`${user.id}:${code}`);
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    if (process.env.NODE_ENV !== "production") console.log(`\n[reset:dev] code for ${mail} -> ${code}\n`);
    await sendEmail({
      to: mail,
      subject: `${APP_NAME} password reset code: ${code}`,
      html: emailLayout(
        "Reset your password",
        `<p>Use this code to reset your password (valid 1 hour):</p>
         <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#2563eb">${code}</p>`,
      ),
    });
  }
  return json({ ok: true });
}
