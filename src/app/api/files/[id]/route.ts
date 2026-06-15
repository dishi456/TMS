import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

export const runtime = "nodejs";

const SENSITIVE = ["PROPERTY_PROOF", "GOVERNMENT_ID", "LEASE"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || !doc.storageKey) return new Response("Not found", { status: 404 });

  // Sensitive docs: only the Master Admin or the owning user may view.
  if (
    SENSITIVE.includes(doc.type) &&
    session.user.role !== "MASTER_ADMIN" &&
    doc.ownerId !== session.user.id
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  let data: Buffer;
  try {
    data = await readFile(doc.storageKey);
  } catch {
    return new Response("File missing", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.fileName ?? "file"}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
