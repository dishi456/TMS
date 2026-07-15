"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CURRENCIES, USERNAME_RE } from "@/lib/profile";

export type AccountState = { error?: string; success?: string } | undefined;

const optional = (s: unknown) => (typeof s === "string" && s.trim() === "" ? undefined : s);

const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your name."),
  username: z.preprocess(optional, z.string().regex(USERNAME_RE, "Username must be 3–20 letters, numbers or underscores.").optional()),
  phone: z.string().trim().optional(),
  currency: z.preprocess(optional, z.enum(CURRENCIES).optional()),
  prefCountry: z.string().trim().optional(),
  prefState: z.string().trim().optional(),
  prefCity: z.string().trim().optional(),
});

// Any signed-in user can update their own profile + password. Only fields the
// form actually submitted are touched, so the leaner admin form (name + phone)
// and the richer landlord form (username + preferences) can share this action.
export async function updateOwnProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.username) {
    const taken = await prisma.user.findFirst({ where: { username: d.username, NOT: { id: session.user.id } }, select: { id: true } });
    if (taken) return { error: "That username is already taken." };
  }

  const data: Prisma.UserUpdateInput = { fullName: d.fullName, phone: d.phone || null };
  if (formData.has("username")) data.username = d.username ?? null;
  if (d.currency) data.currency = d.currency;
  if (formData.has("prefCountry")) data.prefCountry = d.prefCountry || null;
  if (formData.has("prefState")) data.prefState = d.prefState || null;
  if (formData.has("prefCity")) data.prefCity = d.prefCity || null;

  try {
    await prisma.user.update({ where: { id: session.user.id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "That username is already taken." };
    throw e;
  }
  revalidatePath("/master-admin/account");
  revalidatePath("/landlord/account");
  return { success: "Profile updated." };
}

// Save the avatar URL (an /api/files/{id} path) for the signed-in user, after
// the ImageUploader has uploaded the image. Used by all roles.
export async function setOwnAvatar(url: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!/^\/api\/files\/[a-zA-Z0-9]+$/.test(url)) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: url } });
  revalidatePath("/tenant/profile");
  revalidatePath("/landlord/account");
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
