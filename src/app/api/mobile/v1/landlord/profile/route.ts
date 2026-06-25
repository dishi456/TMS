import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function completion(u: { fullName?: string | null; phone?: string | null; avatarUrl?: string | null; username?: string | null; verified?: boolean }) {
  const checks = [!!u.fullName, !!u.phone, !!u.avatarUrl, !!u.username, !!u.verified];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// GET /api/mobile/v1/landlord/profile -> landlord identity + portfolio stats
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, username: true, verified: true, status: true, createdAt: true },
  });
  const [properties, tenants, agg] = await Promise.all([
    prisma.property.count({ where: { landlordId: user.id } }),
    prisma.user.count({ where: { role: "TENANT", landlordId: user.id } }),
    prisma.rating.aggregate({ where: { rateeId: user.id, direction: "TENANT_TO_LANDLORD", status: "VISIBLE" }, _avg: { stars: true }, _count: { _all: true } }),
  ]);
  return json({
    profile: {
      ...u,
      verificationStatus: u?.verified ? "VERIFIED" : u?.status === "PENDING" ? "PENDING" : "NOT_VERIFIED",
      completion: completion(u ?? {}),
      stats: { properties, tenants, rating: agg._avg.stars != null ? Math.round(agg._avg.stars * 10) / 10 : null, ratingCount: agg._count._all },
    },
  });
}

const schema = z.object({
  fullName: z.string().min(2).optional(),
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,20}$/, "Username must be 3-20 letters, numbers or underscores.").optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// PATCH /api/mobile/v1/landlord/profile -> update identity (username unique)
export async function PATCH(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  if (d.username) {
    const taken = await prisma.user.findFirst({ where: { username: d.username, NOT: { id: user.id } }, select: { id: true } });
    if (taken) return json({ error: "That username is already taken." }, 409);
  }
  const data = {
    ...(d.fullName !== undefined ? { fullName: d.fullName } : {}),
    ...(d.username !== undefined ? { username: d.username } : {}),
    ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
    ...(d.avatarUrl !== undefined ? { avatarUrl: d.avatarUrl || null } : {}),
  };
  try {
    const u = await prisma.user.update({ where: { id: user.id }, data, select: { id: true, fullName: true, username: true, phone: true, avatarUrl: true } });
    return json({ ok: true, profile: u });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return json({ error: "That username is already taken." }, 409);
    throw e;
  }
}
