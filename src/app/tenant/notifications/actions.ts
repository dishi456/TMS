"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-helpers";

export async function markRead(formData: FormData) {
  const session = await requireTenant();
  const id = String(formData.get("id"));
  // Scope to the tenant's own notifications.
  await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { read: true } });
  revalidatePath("/tenant/notifications");
  redirect("/tenant/notifications");
}

export async function markAllRead() {
  const session = await requireTenant();
  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } });
  revalidatePath("/tenant/notifications");
  redirect("/tenant/notifications");
}
