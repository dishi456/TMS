"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

export type BlacklistState = { error?: string; success?: string } | undefined;

const schema = z.object({
  tenantId: z.string().min(1, "Choose a tenant."),
  reason: z.string().trim().min(3, "Add a reason for blacklisting."),
});

// Blacklist a tenant the landlord manages directly or has/had a lease with.
export async function addToBlacklist(_prev: BlacklistState, formData: FormData): Promise<BlacklistState> {
  const session = await requireLandlord();
  const landlordId = session.user.id;
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { tenantId, reason } = parsed.data;

  const tenant = await prisma.user.findFirst({
    where: { id: tenantId, role: "TENANT", OR: [{ landlordId }, { tenantLeases: { some: { landlordId } } }] },
    select: { id: true },
  });
  if (!tenant) return { error: "That tenant isn't one of yours." };

  await prisma.blacklist.upsert({
    where: { landlordId_tenantId: { landlordId, tenantId } },
    update: { reason },
    create: { landlordId, tenantId, reason },
  });
  await audit({ actorId: landlordId, action: "tenant.blacklist", entity: "User", entityId: tenantId });
  revalidatePath("/landlord/blacklist");
  return { success: "Tenant added to your blacklist." };
}

export async function removeFromBlacklist(formData: FormData) {
  const session = await requireLandlord();
  const landlordId = session.user.id;
  const tenantId = String(formData.get("tenantId") || "");
  if (tenantId) {
    await prisma.blacklist.deleteMany({ where: { landlordId, tenantId } });
    await audit({ actorId: landlordId, action: "tenant.unblacklist", entity: "User", entityId: tenantId });
  }
  revalidatePath("/landlord/blacklist");
}
