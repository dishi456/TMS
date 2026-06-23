import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ method: z.enum(["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "CASH"]).default("CASH") });

// POST /api/mobile/v1/landlord/invoices/{id}/pay → record an offline payment,
// mark the invoice PAID, notify the tenant. Mirrors landlord recordPayment.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const method = parsed.success ? parsed.data.method : "CASH";

  const invoice = await prisma.invoice.findFirst({
    where: { id, lease: { landlordId: user.id } },
    include: { lease: { select: { tenantId: true } } },
  });
  if (!invoice) return error("Invoice not found.", 404);
  if (invoice.status === "PAID") return error("Invoice already paid.", 409);

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      tenantId: invoice.lease.tenantId,
      amount: invoice.amount,
      method,
      status: "SUCCESS",
      verified: true,
      paidAt: new Date(),
      notes: "Recorded by landlord",
    },
  });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
  await audit({ actorId: user.id, action: "payment.record", entity: "Invoice", entityId: invoice.id });
  await notify(invoice.lease.tenantId, { type: "payment", title: "Payment recorded", body: `Your rent payment was recorded.`, link: "/tenant/payments" });

  return json({ ok: true });
}
