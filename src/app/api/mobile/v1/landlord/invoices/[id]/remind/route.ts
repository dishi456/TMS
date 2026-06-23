import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mobile/v1/landlord/invoices/{id}/remind → nudge the tenant.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, lease: { landlordId: user.id } },
    include: { lease: { select: { tenantId: true } } },
  });
  if (!invoice) return error("Invoice not found.", 404);

  await notify(invoice.lease.tenantId, {
    type: "rent_reminder",
    title: "Rent reminder",
    body: `A rent payment of ₹${Number(invoice.amount).toLocaleString("en-IN")} is due.`,
    link: "/tenant/payments",
  });
  await audit({ actorId: user.id, action: "invoice.remind", entity: "Invoice", entityId: invoice.id });

  return json({ ok: true });
}
