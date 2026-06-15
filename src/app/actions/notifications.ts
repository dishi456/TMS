"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Shared across all roles — scoped to the signed-in user's own notifications.
export async function markNotificationRead(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const id = String(formData.get("id"));
  const back = String(formData.get("back") || "/");
  await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { read: true } });
  revalidatePath(back);
  redirect(back);
}

export async function markAllNotificationsRead(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const back = String(formData.get("back") || "/");
  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } });
  revalidatePath(back);
  redirect(back);
}
