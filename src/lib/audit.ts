import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Records a user activity for auditing (SRS FR-13). Best-effort: an audit
// failure must never break the underlying action.
export async function audit(entry: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
      },
    });
  } catch (e) {
    console.error("audit log failed:", e);
  }
}
