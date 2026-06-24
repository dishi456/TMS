import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(["UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "CASH"]).default("CASH"),
});

// POST /api/mobile/v1/landlord/rent/record  { invoiceId, method } -> record an offline payment + mark invoice paid
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const { invoiceId, method } = parsed.data;

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, lease: { landlordId: user.id } },
    include: { lease: { select: { tenantId: true } } },
  });
  if (!inv) return json({ error: "Invoice not found." }, 404);

  const payment = await prisma.payment.create({
    data: {
      invoiceId, tenantId: inv.lease.tenantId, amount: inv.amount, method,
      status: "SUCCESS", verified: true, paidAt: new Date(), notes: "Recorded by landlord (mobile)",
    },
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
  await audit({ actorId: user.id, action: "payment.record", entity: "Payment", entityId: payment.id });
  await notify(inv.lease.tenantId, { type: "payment", title: "Payment recorded", body: "Your landlord recorded a rent payment.", link: "/tenant/payments" });
  return json({ ok: true, paymentId: payment.id });
}
