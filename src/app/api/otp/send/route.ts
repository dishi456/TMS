import { sendOtp, type OtpPurpose } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: OtpPurpose[] = ["chat", "register"];

// Public: request an email verification code. "login" is NOT allowed here —
// login OTPs are only issued after a password check (see auth actions).
export async function POST(req: Request) {
  const { email, purpose } = await req.json().catch(() => ({}));
  const p = (purpose ?? "chat") as OtpPurpose;
  if (!ALLOWED.includes(p)) return new Response("Invalid purpose.", { status: 400 });

  const result = await sendOtp(String(email ?? ""), p);
  if (!result.ok) return new Response(result.error, { status: 429 });
  return Response.json({ ok: true });
}
