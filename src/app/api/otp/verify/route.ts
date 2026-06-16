import { verifyOtp, type OtpPurpose } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: OtpPurpose[] = ["chat", "register"];

// Public: check a code and, on success, return a one-time verifyToken the
// client passes to the real action (create inquiry / register).
export async function POST(req: Request) {
  const { email, code, purpose } = await req.json().catch(() => ({}));
  const p = (purpose ?? "chat") as OtpPurpose;
  if (!ALLOWED.includes(p)) return new Response("Invalid purpose.", { status: 400 });

  const result = await verifyOtp(String(email ?? ""), String(code ?? ""), p);
  if (!result.ok) return new Response(result.error, { status: 400 });
  return Response.json({ ok: true, verifyToken: result.verifyToken });
}
