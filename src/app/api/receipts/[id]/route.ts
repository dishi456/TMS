import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUser, getMobileUserFromToken } from "@/lib/mobile-auth";
import { receiptHtml } from "@/lib/receipt";

export const runtime = "nodejs";

// GET /api/receipts/{paymentId}[?token=] -> printable HTML receipt for a payment.
// Viewable by the payment's tenant, the lease's landlord, or a Master Admin.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Identify the caller via web session OR mobile bearer/query token.
  const session = await auth();
  let viewerId = session?.user?.id as string | undefined;
  let viewerRole = session?.user?.role as string | undefined;
  if (!viewerId) {
    const qToken = new URL(req.url).searchParams.get("token");
    const m = qToken ? await getMobileUserFromToken(qToken) : await getMobileUser(req);
    if (m) { viewerId = m.id; viewerRole = m.role; }
  }
  if (!viewerId) return new Response("Unauthorized", { status: 401 });

  const p = await prisma.payment.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, fullName: true } },
      invoice: { select: { periodMonth: true, lease: { select: { landlordId: true, landlord: { select: { fullName: true } }, property: { select: { name: true } } } } } },
    },
  });
  if (!p || !p.receiptNumber) return new Response("Receipt not found", { status: 404 });

  const landlordId = p.invoice.lease.landlordId;
  if (viewerRole !== "MASTER_ADMIN" && viewerId !== p.tenantId && viewerId !== landlordId) {
    return new Response("Forbidden", { status: 403 });
  }

  const html = receiptHtml({
    receiptNumber: p.receiptNumber, amount: Number(p.amount), method: p.method, reference: p.reference,
    paidAt: p.paidAt, periodMonth: p.invoice.periodMonth, status: p.status,
    property: p.invoice.lease.property?.name ?? "—", tenant: p.tenant.fullName,
    landlord: p.invoice.lease.landlord?.fullName ?? "—", notes: p.notes,
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, max-age=60" } });
}
