"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLandlord } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export type FormState = { error?: string } | undefined;

// Confirm a tenant belongs to the current landlord before acting on them.
async function ownTenant(landlordId: string, tenantId: string) {
  return prisma.user.findFirst({
    where: { id: tenantId, role: "TENANT", landlordId },
  });
}

// Delegated approval: the landlord approves their own pending tenant.
export async function approveTenant(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  if (!(await ownTenant(session.user.id, id))) redirect("/landlord/tenants");

  await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
  await audit({ actorId: session.user.id, action: "tenant.approve", entity: "User", entityId: id });
  await notify(id, { type: "account", title: "Your account was approved", body: "Your landlord approved your account. Welcome!", link: "/tenant" });
  revalidatePath("/landlord/tenants");
  redirect("/landlord/tenants?approved=1");
}

export async function setTenantStatus(formData: FormData) {
  const session = await requireLandlord();
  const id = String(formData.get("id"));
  if (!(await ownTenant(session.user.id, id))) redirect("/landlord/tenants");
  const status = formData.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";

  await prisma.user.update({ where: { id }, data: { status } });
  await audit({
    actorId: session.user.id,
    action: status === "SUSPENDED" ? "user.suspend" : "user.activate",
    entity: "User",
    entityId: id,
  });
  revalidatePath("/landlord/tenants");
  redirect("/landlord/tenants");
}

const addSchema = z.object({
  fullName: z.string().min(2, "Enter the tenant's name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().trim().optional(),
  governmentId: z.string().trim().optional(),
});

// SRS §4.2 "Add Tenant": landlord onboards a tenant directly (already active).
export async function addTenant(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireLandlord();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  try {
    const tenant = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email.toLowerCase(),
        passwordHash: await bcrypt.hash(d.password, 10),
        role: "TENANT",
        status: "ACTIVE",
        landlordId: session.user.id,
        phone: d.phone && d.phone.length > 0 ? d.phone : null,
        governmentId: d.governmentId && d.governmentId.length > 0 ? d.governmentId : null,
      },
    });
    await audit({ actorId: session.user.id, action: "tenant.add", entity: "User", entityId: tenant.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A user with this email already exists." };
    }
    throw e;
  }

  revalidatePath("/landlord/tenants");
  redirect("/landlord/tenants?added=1");
}
