import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";
import { getMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";

const SENSITIVE = ["PROPERTY_PROOF", "GOVERNMENT_ID", "LEASE"];
// Only these are safe to render inline in a browser; anything else downloads.
const INLINE_IMAGE = /^image\/(png|jpe?g|gif|webp|heic|heif|avif|bmp)$/i;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || !doc.storageKey) return new Response("Not found", { status: 404 });

  // Property photos are public — they show on the public listings page, so
  // anyone (signed in or not) can view them. Everything else requires auth.
  const isPublicPhoto = doc.type === "PHOTO" && !!doc.propertyId;

  if (!isPublicPhoto) {
    // Identify the caller via the web session OR a mobile Bearer token, so
    // native clients can fetch their own lease/ID documents.
    const session = await auth();
    let viewerId = session?.user?.id as string | undefined;
    let viewerRole = session?.user?.role as string | undefined;
    if (!viewerId) {
      const m = await getMobileUser(req);
      if (m) { viewerId = m.id; viewerRole = m.role; }
    }
    if (!viewerId) return new Response("Unauthorized", { status: 401 });
    // Sensitive docs: only the Master Admin or the owning user may view.
    if (SENSITIVE.includes(doc.type) && viewerRole !== "MASTER_ADMIN" && doc.ownerId !== viewerId) {
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
  // Never serve a user-uploaded file inline unless it's a real image, and never
  // echo a client-controlled content-type for non-images — prevents a stored
  // HTML/SVG upload from executing as script on our origin.
  const ct = doc.contentType ?? "";
  const isImage = INLINE_IMAGE.test(ct);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": isImage ? ct : "application/octet-stream",
      "Content-Disposition": `${isImage ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPublicPhoto ? "public, max-age=3600" : "private, max-age=60",
    },
  });
}
