import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fields that count toward the profile-completion percentage.
function completion(u: { fullName?: string | null; phone?: string | null; avatarUrl?: string | null; username?: string | null; governmentId?: string | null; emergencyContact?: string | null; verified?: boolean }) {
  const checks = [!!u.fullName, !!u.phone, !!u.avatarUrl, !!u.username, !!u.governmentId, !!u.emergencyContact, !!u.verified];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// GET /api/mobile/v1/tenant/profile -> profile + preferences + documents + completion
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, fullName: true, email: true, phone: true, governmentId: true,
      emergencyContact: true, avatarUrl: true, verified: true, status: true,
      username: true, currency: true, prefCountry: true, prefState: true, prefCity: true,
    },
  });
  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: "GOVERNMENT_ID" },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, fileName: true, label: true, createdAt: true },
  });
  return json({
    profile: {
      ...u,
      verificationStatus: u?.verified ? "VERIFIED" : u?.status === "PENDING" ? "PENDING" : "NOT_VERIFIED",
      completion: completion(u ?? {}),
    },
    documents: docs.map((d) => ({ ...d, url: `/api/files/${d.id}` })),
  });
}

const schema = z.object({
  fullName: z.string().min(2).optional(),
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,20}$/, "Username must be 3-20 letters, numbers or underscores.").optional(),
  phone: z.string().optional(),
  governmentId: z.string().optional(),
  emergencyContact: z.string().optional(),
  avatarUrl: z.string().optional(),
  currency: z.enum(["INR", "USD", "CAD", "GBP", "EUR", "AUD"]).optional(),
  prefCountry: z.string().optional(),
  prefState: z.string().optional(),
  prefCity: z.string().optional(),
});

// PATCH /api/mobile/v1/tenant/profile -> update profile + preferences (username unique)
export async function PATCH(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
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
    ...(d.governmentId !== undefined ? { governmentId: d.governmentId || null } : {}),
    ...(d.emergencyContact !== undefined ? { emergencyContact: d.emergencyContact || null } : {}),
    ...(d.avatarUrl !== undefined ? { avatarUrl: d.avatarUrl || null } : {}),
    ...(d.currency !== undefined ? { currency: d.currency } : {}),
    ...(d.prefCountry !== undefined ? { prefCountry: d.prefCountry || null } : {}),
    ...(d.prefState !== undefined ? { prefState: d.prefState || null } : {}),
    ...(d.prefCity !== undefined ? { prefCity: d.prefCity || null } : {}),
  };
  try {
    const u = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, fullName: true, username: true, phone: true, avatarUrl: true, currency: true, prefCountry: true, prefState: true, prefCity: true },
    });
    return json({ ok: true, profile: u });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return json({ error: "That username is already taken." }, 409);
    }
    throw e;
  }
}
