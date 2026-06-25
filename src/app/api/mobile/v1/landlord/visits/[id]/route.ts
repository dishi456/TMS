import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEXT: Record<string, "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED"> = {
  confirm: "CONFIRMED", decline: "DECLINED", complete: "COMPLETED", cancel: "CANCELLED",
};
const schema = z.object({ action: z.enum(["confirm", "decline", "complete", "cancel"]) });

// PATCH /api/mobile/v1/landlord/visits/{id}  { action } -> update visit status (+ email on confirm/decline)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const status = NEXT[parsed.data.action];

  const visit = await prisma.visit.findFirst({ where: { id, property: { landlordId: user.id } }, include: { property: { select: { name: true, address: true } } } });
  if (!visit) return json({ error: "Not found." }, 404);

  await prisma.visit.update({ where: { id }, data: { status } });
  await audit({ actorId: user.id, action: `visit.${parsed.data.action}`, entity: "Visit", entityId: id });
  if (status === "CONFIRMED" || status === "DECLINED") {
    const whenStr = visit.preferredAt
      ? visit.preferredAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
      : "the requested time";
    await sendEmail({
      to: visit.email,
      subject: status === "CONFIRMED" ? `Your visit to ${visit.property.name} is confirmed` : `Update on your visit request for ${visit.property.name}`,
      html: emailLayout(
        status === "CONFIRMED" ? "Visit confirmed" : "Visit request update",
        status === "CONFIRMED"
          ? `<p>Hi ${visit.fullName}, your tour of <strong>${visit.property.name}</strong> is confirmed for <strong>${whenStr}</strong>.</p>`
          : `<p>Hi ${visit.fullName}, the requested time for <strong>${visit.property.name}</strong> doesn't work. Please pick another slot.</p>`,
      ),
    });
  }
  return json({ ok: true, status });
}
