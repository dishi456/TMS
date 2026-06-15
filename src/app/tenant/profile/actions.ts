"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-helpers";
import { saveFile, removeFile } from "@/lib/storage";

export type FormState = { error?: string; success?: string } | undefined;
const MAX_BYTES = 8 * 1024 * 1024;

const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your name."),
  phone: z.string().trim().optional(),
  governmentId: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTenant();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      fullName: d.fullName,
      phone: d.phone || null,
      governmentId: d.governmentId || null,
      emergencyContact: d.emergencyContact || null,
    },
  });
  revalidatePath("/tenant/profile");
  return { success: "Profile updated." };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTenant();
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

export async function uploadProfileDoc(formData: FormData) {
  const session = await requireTenant();
  const kind = formData.get("kind") === "GOVERNMENT_ID" ? "GOVERNMENT_ID" : "OTHER";
  const file = formData.get("file");
  const back = "/tenant/profile";
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  if (file.size > MAX_BYTES) redirect(`${back}?error=toobig`);

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10);
  const key = `users/${session.user.id}/${randomUUID()}${ext}`;
  await saveFile(key, bytes);
  await prisma.document.create({
    data: {
      ownerId: session.user.id,
      type: kind,
      storageKey: key,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: bytes.length,
      label: file.name,
    },
  });
  revalidatePath(back);
  redirect(`${back}?uploaded=1`);
}

export async function deleteProfileDoc(formData: FormData) {
  const session = await requireTenant();
  const docId = String(formData.get("docId"));
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc || doc.ownerId !== session.user.id) redirect("/tenant/profile");
  if (doc.storageKey) await removeFile(doc.storageKey);
  await prisma.document.delete({ where: { id: docId } });
  revalidatePath("/tenant/profile");
  redirect("/tenant/profile");
}
