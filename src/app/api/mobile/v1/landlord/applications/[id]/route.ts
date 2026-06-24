import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]) });

// PATCH /api/mobile/v1/landlord/applications/{id}  { decision } -> approve/reject + email applicant
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const decision = parsed.data.decision;

  const app = await prisma.application.findFirst({ where: { id, property: { landlordId: user.id } }, include: { property: { select: { name: true } } } });
  if (!app) return json({ error: "Not found." }, 404);

  await prisma.application.update({ where: { id }, data: { status: decision } });
  await audit({ actorId: user.id, action: `application.${decision.toLowerCase()}`, entity: "Application", entityId: id });
  await sendEmail({
    to: app.email,
    subject: decision === "APPROVED" ? `Your application for ${app.property.name} was approved` : `Update on your application for ${app.property.name}`,
    html: emailLayout(
      decision === "APPROVED" ? "Application approved" : "Application update",
      decision === "APPROVED"
        ? `<p>Good news, ${app.fullName}! Your application for <strong>${app.property.name}</strong> was approved.</p>`
        : `<p>Hi ${app.fullName}, your application for <strong>${app.property.name}</strong> wasn't successful this time.</p>`,
    ),
  });
  return json({ ok: true });
}
