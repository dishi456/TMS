"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";

// Confirm the application is for one of this landlord's properties.
async function ownApplication(landlordId: string, id: string) {
  return prisma.application.findFirst({
    where: { id, property: { landlordId } },
    include: { property: { select: { name: true } } },
  });
}

export async function decideApplication(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const decision = formData.get("decision") === "APPROVED" ? "APPROVED" : "REJECTED";
  const app = await ownApplication(session.user.id, id);
  if (!app) redirect("/landlord/applications");

  await prisma.application.update({ where: { id }, data: { status: decision } });
  await audit({ actorId: session.user.id, action: `application.${decision.toLowerCase()}`, entity: "Application", entityId: id });

  await sendEmail({
    to: app.email,
    subject: decision === "APPROVED" ? `Your application for ${app.property.name} was approved` : `Update on your application for ${app.property.name}`,
    html: emailLayout(
      decision === "APPROVED" ? "Application approved" : "Application update",
      decision === "APPROVED"
        ? `<p>Good news, ${app.fullName}! Your application for <strong>${app.property.name}</strong> has been approved. The landlord will reach out with next steps.</p>`
        : `<p>Hi ${app.fullName}, thank you for your interest in <strong>${app.property.name}</strong>. Unfortunately your application wasn't successful this time.</p>`,
    ),
  });

  revalidatePath("/landlord/applications");
  redirect("/landlord/applications");
}
