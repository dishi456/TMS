import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/landlord/rent/remind  { invoiceId } -> nudge the tenant about a due invoice
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { invoiceId } = await req.json().catch(() => ({}));
  const inv = await prisma.invoice.findFirst({
    where: { id: String(invoiceId ?? ""), lease: { landlordId: user.id } },
    include: { lease: { select: { tenantId: true, property: { select: { name: true } } } } },
  });
  if (!inv) return json({ error: "Invoice not found." }, 404);
  if (inv.status === "PAID") return json({ error: "This invoice is already paid." }, 400);

  await notify(inv.lease.tenantId, {
    type: "rent",
    title: "Rent reminder",
    body: `Payment for ${inv.lease.property?.name ?? "your rental"} (${inv.periodMonth}) is due.`,
    link: "/tenant/payments",
  });
  await audit({ actorId: user.id, action: "rent.remind", entity: "Invoice", entityId: inv.id });
  return json({ ok: true });
}
