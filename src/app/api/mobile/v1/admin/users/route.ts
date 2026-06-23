import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["MASTER_ADMIN", "LANDLORD", "TENANT", "USER"];
const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"];

// GET /api/mobile/v1/admin/users?role=&status=&q=&page= → user directory.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;
  const sp = new URL(req.url).searchParams;
  const role = (sp.get("role") || "").toUpperCase();
  const status = (sp.get("status") || "").toUpperCase();
  const q = (sp.get("q") || "").trim();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const pageSize = 30;

  const where: Prisma.UserWhereInput = {
    ...(ROLES.includes(role) ? { role: role as Prisma.UserWhereInput["role"] } : {}),
    ...(STATUSES.includes(status) ? { status: status as Prisma.UserWhereInput["status"] } : {}),
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, verified: true, createdAt: true },
    }),
  ]);

  return json({
    items: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    total, page, pages: Math.ceil(total / pageSize),
  });
}
