import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/activity -> recent audit-log entries
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    include: { actor: { select: { id: true, fullName: true, role: true } } },
  });
  return json({
    activity: logs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity, entityId: l.entityId,
      actor: l.actor, ip: l.ip, createdAt: l.createdAt,
    })),
  });
}
