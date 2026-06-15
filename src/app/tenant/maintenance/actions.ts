"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export type FormState = { error?: string } | undefined;

const schema = z.object({
  propertyId: z.string().min(1, "Select your property."),
  title: z.string().min(3, "Enter a short title."),
  description: z.string().min(5, "Describe the issue."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export async function submitMaintenance(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // The tenant must have a lease on the chosen property.
  const lease = await prisma.lease.findFirst({ where: { tenantId: session.user.id, propertyId: d.propertyId } });
  if (!lease) return { error: "You don't have a lease on that property." };

  // Images are pre-uploaded by the client via the ImageUploader; read their urls.
  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean).slice(0, 5);

  const req = await prisma.maintenanceRequest.create({
    data: {
      propertyId: d.propertyId,
      tenantId: session.user.id,
      title: d.title,
      description: d.description,
      priority: d.priority,
      status: "PENDING",
      images: imageUrls,
    },
  });
  await audit({ actorId: session.user.id, action: "maintenance.submit", entity: "MaintenanceRequest", entityId: req.id });

  const prop = await prisma.property.findUnique({ where: { id: d.propertyId }, select: { landlordId: true } });
  await notify(prop?.landlordId, { type: "maintenance", title: "New maintenance request", body: d.title, link: `/landlord/maintenance/${req.id}` });

  revalidatePath("/tenant/maintenance");
  redirect("/tenant/maintenance?created=1");
}
