"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

export type FormState = { error?: string } | undefined;

const star = z.coerce.number().int().min(1).max(5);
const schema = z.object({
  leaseId: z.string().min(1),
  stars: star,
  feedback: z.string().trim().optional(),
  recommend: z.string().optional(), // "on" when checked
  rentDiscipline: star,
  propertyMaintenance: star,
  communication: star,
  ruleCompliance: star,
  conduct: star,
});

// SRS §4.2: landlord rates a tenant after lease completion/expiration/termination.
export async function rateTenant(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireLandlord();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const lease = await prisma.lease.findFirst({
    where: { id: d.leaseId, landlordId: session.user.id, status: { in: ["COMPLETED", "EXPIRED", "TERMINATED"] } },
  });
  if (!lease) return { error: "You can only rate tenants after the lease has ended." };

  await prisma.rating.upsert({
    where: { leaseId_direction: { leaseId: d.leaseId, direction: "LANDLORD_TO_TENANT" } },
    update: {
      stars: d.stars,
      feedback: d.feedback || null,
      recommend: d.recommend === "on",
      criteria: {
        rentDiscipline: d.rentDiscipline,
        propertyMaintenance: d.propertyMaintenance,
        communication: d.communication,
        ruleCompliance: d.ruleCompliance,
        conduct: d.conduct,
      },
    },
    create: {
      leaseId: d.leaseId,
      direction: "LANDLORD_TO_TENANT",
      raterId: session.user.id,
      rateeId: lease.tenantId,
      stars: d.stars,
      feedback: d.feedback || null,
      recommend: d.recommend === "on",
      criteria: {
        rentDiscipline: d.rentDiscipline,
        propertyMaintenance: d.propertyMaintenance,
        communication: d.communication,
        ruleCompliance: d.ruleCompliance,
        conduct: d.conduct,
      },
      status: "VISIBLE",
    },
  });
  await audit({ actorId: session.user.id, action: "tenant.rate", entity: "Rating", entityId: d.leaseId });

  revalidatePath("/landlord/reviews");
  redirect("/landlord/reviews?rated=1");
}
