import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

export const runtime = "nodejs";

const SENSITIVE = ["PROPERTY_PROOF", "GOVERNMENT_ID", "LEASE"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || !doc.storageKey) return new Response("Not found", { status: 404 });

  // Property photos are public — they show on the public listings page, so
  // anyone (signed in or not) can view them. Everything else requires auth.
  const isPublicPhoto = doc.type === "PHOTO" && !!doc.propertyId;

  if (!isPublicPhoto) {
    const session = await auth();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });
    // Sensitive docs: only the Master Admin or the owning user may view.
    if (
      SENSITIVE.includes(doc.type) &&
      session.user.role !== "MASTER_ADMIN" &&
      doc.ownerId !== session.user.id
    ) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let data: Buffer;
  try {
    data = await readFile(doc.storageKey);
  } catch {
    return new Response("File missing", { status: 404 });
  }

  // Header values must be Latin-1; filenames may contain unicode (e.g. an em
  // dash), so provide an ASCII-safe fallback + RFC 5987 UTF-8 encoded name.
  const rawName = doc.fileName ?? "file";
  const asciiName = rawName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`,
      "Cache-Control": isPublicPhoto ? "public, max-age=3600" : "private, max-age=60",
    },
  });
}
