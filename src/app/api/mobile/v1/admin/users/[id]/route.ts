import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/users/{id}
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const { id } = await ctx.params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, email: true, role: true, status: true, verified: true, reviewsSuspended: true,
      phone: true, governmentId: true, emergencyContact: true, avatarUrl: true, landlordId: true, createdAt: true,
      _count: { select: { ownedProperties: true, landlordLeases: true, tenantLeases: true } },
    },
  });
  if (!u) return json({ error: "Not found." }, 404);
  return json({ user: u });
}

const schema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  governmentId: z.string().optional(),
  emergencyContact: z.string().optional(),
  password: z.string().min(8).optional(),
});

// PATCH /api/mobile/v1/admin/users/{id} -> update profile fields (and optionally password)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  const data = {
    ...(d.fullName !== undefined ? { fullName: d.fullName } : {}),
    ...(d.email !== undefined ? { email: d.email.toLowerCase() } : {}),
    ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
    ...(d.governmentId !== undefined ? { governmentId: d.governmentId || null } : {}),
    ...(d.emergencyContact !== undefined ? { emergencyContact: d.emergencyContact || null } : {}),
    ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 10) } : {}),
  };
  try {
    await prisma.user.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return json({ error: "That email is already in use." }, 409);
    throw e;
  }
  await audit({ actorId: user.id, action: "user.update", entity: "User", entityId: id });
  return json({ ok: true });
}
