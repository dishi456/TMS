import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

export const APP_NAME = "Lease Lord";

// ---- Transport selection -------------------------------------------------
// Preferred: Gmail SMTP via an App Password (set GMAIL_USER + GMAIL_APP_PASSWORD).
// Fallback: Resend (RESEND_API_KEY). Last resort (dev): log to the console.

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""); // App Passwords are shown with spaces

let gmailTransport: Transporter | null = null;
if (gmailUser && gmailPass) {
  gmailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });
}

const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

const from =
  process.env.EMAIL_FROM ||
  (gmailUser ? `${APP_NAME} <${gmailUser}>` : `${APP_NAME} <onboarding@resend.dev>`);

export function emailConfigured(): boolean {
  return !!gmailTransport || !!resend;
}

// Send an email. Tries Gmail SMTP first, then Resend, then logs to the console
// so flows still work in development without any credentials configured.
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (gmailTransport) {
    try {
      await gmailTransport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
      return;
    } catch (e) {
      console.error("gmail send failed:", e);
      // fall through to other transports
    }
  }
  if (resend) {
    try {
      await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
      return;
    } catch (e) {
      console.error("resend send failed:", e);
    }
  }
  console.log(
    `\n[email:dev] →  ${opts.to}\n[subject] ${opts.subject}\n${opts.html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()}\n`,
  );
}

// Minimal branded wrapper for email bodies.
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <h2 style="color:#2563eb">${title}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:12px;color:#64748b">${APP_NAME}</p>
  </div>`;
}
