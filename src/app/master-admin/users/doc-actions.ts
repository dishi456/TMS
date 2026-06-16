"use server";

import { randomUUID } from "crypto";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { saveFile, removeFile } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;

// Master Admin uploads a verification document (ID / photo) on behalf of a user.
export async function adminUploadUserDoc(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId"));
  const kind = formData.get("kind") === "AADHAAR" ? "GOVERNMENT_ID" : "PHOTO";
  const back = `/master-admin/users/${userId}`;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) redirect("/master-admin/users");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  if (file.size > MAX_BYTES) redirect(`${back}?error=toobig`);

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10);
  const key = `users/${userId}/${randomUUID()}${ext}`;
  await saveFile(key, bytes);

  const doc = await prisma.document.create({
    data: {
      ownerId: userId,
      type: kind,
      storageKey: key,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: bytes.length,
      label: file.name,
    },
  });
  await audit({ actorId: session.user.id, action: "landlord.docUpload", entity: "User", entityId: userId, metadata: { docId: doc.id, kind, byAdmin: true } });

  revalidatePath(back);
  redirect(`${back}?uploaded=1`);
}

export async function adminDeleteUserDoc(formData: FormData) {
  const session = await requireAdmin();
  const docId = String(formData.get("docId"));
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) redirect("/master-admin/users");

  if (doc.storageKey) await removeFile(doc.storageKey);
  await prisma.document.delete({ where: { id: docId } });
  await audit({ actorId: session.user.id, action: "landlord.docDelete", entity: "User", entityId: doc.ownerId, metadata: { byAdmin: true } });

  revalidatePath(`/master-admin/users/${doc.ownerId}`);
  redirect(`/master-admin/users/${doc.ownerId}`);
}
