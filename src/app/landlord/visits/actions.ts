"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";

// Confirm the visit is for one of this landlord's properties.
async function ownVisit(landlordId: string, id: string) {
  return prisma.visit.findFirst({
    where: { id, property: { landlordId } },
    include: { property: { select: { name: true, address: true } } },
  });
}

const NEXT: Record<string, "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED"> = {
  confirm: "CONFIRMED",
  decline: "DECLINED",
  complete: "COMPLETED",
  cancel: "CANCELLED",
};

export async function decideVisit(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  const status = NEXT[action];
  if (!status) redirect("/landlord/visits");

  const visit = await ownVisit(session.user.id, id);
  if (!visit) redirect("/landlord/visits");

  await prisma.visit.update({ where: { id }, data: { status } });
  await audit({ actorId: session.user.id, action: `visit.${action}`, entity: "Visit", entityId: id });

  const whenStr = visit.preferredAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  if (status === "CONFIRMED" || status === "DECLINED") {
    await sendEmail({
      to: visit.email,
      subject:
        status === "CONFIRMED"
          ? `Your visit to ${visit.property.name} is confirmed`
          : `Update on your visit request for ${visit.property.name}`,
      html: emailLayout(
        status === "CONFIRMED" ? "Visit confirmed" : "Visit request update",
        status === "CONFIRMED"
          ? `<p>Hi ${visit.fullName}, your tour of <strong>${visit.property.name}</strong> (${visit.property.address}) is confirmed for <strong>${whenStr}</strong>. See you there!</p>`
          : `<p>Hi ${visit.fullName}, unfortunately the requested time for <strong>${visit.property.name}</strong> doesn't work. Please pick another slot from the listing.</p>`,
      ),
    });
  }

  revalidatePath("/landlord/visits");
  redirect("/landlord/visits");
}
