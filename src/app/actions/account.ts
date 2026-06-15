"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type AccountState = { error?: string; success?: string } | undefined;

const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your name."),
  phone: z.string().trim().optional(),
});

// Any signed-in user can update their own profile + password.
export async function updateOwnProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { fullName: parsed.data.fullName, phone: parsed.data.phone || null },
  });
  revalidatePath("/master-admin/account");
  revalidatePath("/landlord/account");
  return { success: "Profile updated." };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export async function changeOwnPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Account not found." };
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { error: "Your current password is incorrect." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return { success: "Password changed." };
}
