"use server";

import { randomUUID } from "crypto";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { saveFile, removeFile } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;
const BACK = "/landlord/verification";

// Landlord uploads a verification document: Aadhaar (GOVERNMENT_ID) or a
// property photo (PHOTO). These are profile docs — not tied to a property/lease.
export async function uploadVerificationDoc(formData: FormData) {
  const session = await requireLandlord();
  const userId = session.user.id;
  const kind = formData.get("kind") === "AADHAAR" ? "GOVERNMENT_ID" : "PHOTO";
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) redirect(`${BACK}?error=nofile`);
  if (file.size > MAX_BYTES) redirect(`${BACK}?error=toobig`);

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
  await audit({
    actorId: userId,
    action: "landlord.docUpload",
    entity: "User",
    entityId: userId,
    metadata: { docId: doc.id, kind },
  });

  revalidatePath(BACK);
  redirect(`${BACK}?uploaded=1`);
}

export async function deleteVerificationDoc(formData: FormData) {
  const session = await requireLandlord();
  const docId = String(formData.get("docId"));
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  // Only the owner may remove their own verification document.
  if (!doc || doc.ownerId !== session.user.id) redirect(BACK);

  if (doc.storageKey) await removeFile(doc.storageKey);
  await prisma.document.delete({ where: { id: docId } });
  await audit({ actorId: session.user.id, action: "landlord.docDelete", entity: "User", entityId: session.user.id });

  revalidatePath(BACK);
  redirect(BACK);
}
