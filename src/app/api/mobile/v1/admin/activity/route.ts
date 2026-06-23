import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/activity → recent audit log.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, action: true, entity: true, entityId: true, createdAt: true, actor: { select: { fullName: true } } },
  });

  return json({
    items: logs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity, entityId: l.entityId,
      actor: l.actor?.fullName ?? "System", createdAt: l.createdAt.toISOString(),
    })),
  });
}
