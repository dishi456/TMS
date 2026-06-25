import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mask = (n: string | null) => (!n ? null : n.length <= 4 ? n : `•••• ${n.slice(-4)}`);

// GET /api/mobile/v1/tenant/documents -> the tenant's identity documents
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: { in: ["GOVERNMENT_ID", "OTHER"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, docNumber: true, expiryDate: true, verified: true, fileName: true, contentType: true, createdAt: true },
  });
  return json({
    documents: docs.map((d) => ({
      id: d.id,
      type: d.label || "Document",
      numberMasked: mask(d.docNumber),
      expiryDate: d.expiryDate,
      verified: d.verified,
      verificationStatus: d.verified ? "VERIFIED" : "PENDING",
      fileName: d.fileName,
      isImage: (d.contentType || "").startsWith("image/"),
      url: `/api/files/${d.id}`,
      createdAt: d.createdAt,
    })),
  });
}
