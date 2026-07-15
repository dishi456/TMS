"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

// Remove an individual chat message (moderation).
export async function deleteChatMessage(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const leaseId = String(formData.get("leaseId"));
  const msg = await prisma.leaseMessage.findUnique({ where: { id }, select: { id: true } });
  if (msg) {
    await prisma.leaseMessage.delete({ where: { id } });
    await audit({ actorId: session.user.id, action: "chat.deleteMessage", entity: "LeaseMessage", entityId: id });
  }
  revalidatePath(`/master-admin/chat/${leaseId}`);
}
