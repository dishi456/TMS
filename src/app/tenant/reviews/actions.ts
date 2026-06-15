"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

export type FormState = { error?: string } | undefined;

const star = z.coerce.number().int().min(1).max(5);
const schema = z.object({
  leaseId: z.string().min(1),
  stars: star,
  feedback: z.string().trim().optional(),
  recommend: z.string().optional(),
  propertyQuality: star,
  maintenanceSupport: star,
  communication: star,
  transparency: star,
  overall: star,
});

// SRS §4.3: tenant rates the landlord after lease completion/termination.
export async function rateLandlord(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const lease = await prisma.lease.findFirst({
    where: { id: d.leaseId, tenantId: session.user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
  });
  if (!lease) return { error: "You can only rate the landlord after the lease has ended." };

  const criteria = {
    propertyQuality: d.propertyQuality,
    maintenanceSupport: d.maintenanceSupport,
    communication: d.communication,
    transparency: d.transparency,
    overall: d.overall,
  };

  await prisma.rating.upsert({
    where: { leaseId_direction: { leaseId: d.leaseId, direction: "TENANT_TO_LANDLORD" } },
    update: { stars: d.stars, feedback: d.feedback || null, recommend: d.recommend === "on", criteria },
    create: {
      leaseId: d.leaseId,
      direction: "TENANT_TO_LANDLORD",
      raterId: session.user.id,
      rateeId: lease.landlordId,
      stars: d.stars,
      feedback: d.feedback || null,
      recommend: d.recommend === "on",
      criteria,
      status: "VISIBLE",
    },
  });
  await audit({ actorId: session.user.id, action: "landlord.rate", entity: "Rating", entityId: d.leaseId });
  revalidatePath("/tenant/reviews");
  redirect("/tenant/reviews?rated=1");
}
