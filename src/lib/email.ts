import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "TMS <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

export function emailConfigured(): boolean {
  return !!apiKey;
}

// Send an email via Resend. Graceful fallback: if no API key is configured,
// the message is logged to the server console so flows (e.g. password reset)
// still work in development.
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    console.log(`\n[email:dev] →  ${opts.to}\n[subject] ${opts.subject}\n${opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`);
    return;
  }
  try {
    await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
  } catch (e) {
    console.error("email send failed:", e);
  }
}

// Minimal branded wrapper for email bodies.
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <h2 style="color:#2563eb">${title}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:12px;color:#64748b">Tenant Management System</p>
  </div>`;
}
