import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/me → current account (any authenticated role).
export async function GET(req: Request) {
  const user = await requireMobileUser(req);
  if (user instanceof Response) return user;

  return json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    verified: user.verified,
    status: user.status,
  });
}
