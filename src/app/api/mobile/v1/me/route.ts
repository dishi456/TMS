import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/me -> current user profile (any authenticated role)
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req);
  if (res) return res;
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, fullName: true, email: true, role: true, status: true,
      phone: true, avatarUrl: true, verified: true, governmentId: true,
      emergencyContact: true, createdAt: true, username: true, currency: true,
    },
  });
  return json({ user: u });
}
