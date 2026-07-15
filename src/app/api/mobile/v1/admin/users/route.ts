import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/users?role=&q= -> list users
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const sp = new URL(req.url).searchParams;
  const role = sp.get("role")?.trim();
  const q = sp.get("q")?.trim();
  const where: Prisma.UserWhereInput = {
    ...(role && ["MASTER_ADMIN", "LANDLORD", "TENANT", "USER"].includes(role) ? { role: role as Prisma.UserWhereInput["role"] } : {}),
    ...(q ? { OR: [{ fullName: { contains: q } }, { email: { contains: q } }] } : {}),
  };
  const users = await prisma.user.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, fullName: true, email: true, role: true, status: true, verified: true, phone: true, createdAt: true },
  });
  return json({ users });
}

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["LANDLORD", "TENANT", "USER"]),
  phone: z.string().optional(),
});

// POST /api/mobile/v1/admin/users -> create a user
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  try {
    const created = await prisma.user.create({
      data: { fullName: d.fullName, email: d.email.toLowerCase(), phone: d.phone || null, role: d.role, passwordHash: await bcrypt.hash(d.password, 10) },
    });
    await audit({ actorId: user.id, action: "user.create", entity: "User", entityId: created.id, metadata: { role: d.role } });
    return json({ ok: true, id: created.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return json({ error: "A user with this email already exists." }, 409);
    throw e;
  }
}
