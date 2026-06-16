"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export type FormState = { error?: string; success?: string } | undefined;

const baseSchema = z.object({
  fullName: z.string().min(2, "Name is too short."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  role: z.enum(["LANDLORD", "TENANT", "USER"]),
  governmentId: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
});

function clean(v?: string) {
  return v && v.length > 0 ? v : null;
}

// ---- Create ----
export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = baseSchema
    .extend({ password: z.string().min(8, "Password must be at least 8 characters.") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  try {
    const created = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email.toLowerCase(),
        phone: clean(d.phone),
        role: d.role,
        governmentId: clean(d.governmentId),
        emergencyContact: clean(d.emergencyContact),
        passwordHash: await bcrypt.hash(d.password, 10),
      },
    });
    await audit({
      actorId: session.user.id,
      action: "user.create",
      entity: "User",
      entityId: created.id,
      metadata: { role: d.role, email: created.email },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A user with this email already exists." };
    }
    throw e;
  }

  revalidatePath("/master-admin/users");
  redirect(`/master-admin/users?role=${d.role}&created=1`);
}

// ---- Update ----
export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = baseSchema
    .extend({ id: z.string().min(1), password: z.string().optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const data: Prisma.UserUpdateInput = {
    fullName: d.fullName,
    email: d.email.toLowerCase(),
    phone: clean(d.phone),
    governmentId: clean(d.governmentId),
    emergencyContact: clean(d.emergencyContact),
  };
  if (d.password && d.password.length > 0) {
    if (d.password.length < 8) return { error: "Password must be at least 8 characters." };
    data.passwordHash = await bcrypt.hash(d.password, 10);
  }

  try {
    await prisma.user.update({ where: { id: d.id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That email is already in use by another account." };
    }
    throw e;
  }

  await audit({ actorId: session.user.id, action: "user.update", entity: "User", entityId: d.id });
  revalidatePath("/master-admin/users");
  revalidatePath(`/master-admin/users/${d.id}`);
  return { success: "Changes saved." };
}

// ---- Activate / Suspend ----
export async function setUserStatus(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const status = formData.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  await prisma.user.update({ where: { id }, data: { status } });
  await audit({
    actorId: session.user.id,
    action: status === "SUSPENDED" ? "user.suspend" : "user.activate",
    entity: "User",
    entityId: id,
  });
  if (status === "ACTIVE") {
    await notify(id, { type: "account", title: "Account approved", body: "Your account has been approved by the administrator.", link: "/" });
  }
  revalidatePath("/master-admin/users");
  revalidatePath(`/master-admin/users/${id}`);
}

// ---- Verify / Unverify (tenants) ----
export async function setUserVerified(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const verified = formData.get("verified") === "true";
  await prisma.user.update({ where: { id }, data: { verified } });
  await audit({
    actorId: session.user.id,
    action: verified ? "user.verify" : "user.unverify",
    entity: "User",
    entityId: id,
  });
  revalidatePath("/master-admin/users");
  revalidatePath(`/master-admin/users/${id}`);
}

// ---- Delete (blocked when the user has dependent records) ----
export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role") || "LANDLORD");

  const [props, leases, pays] = await Promise.all([
    prisma.property.count({ where: { landlordId: id } }),
    prisma.lease.count({ where: { OR: [{ landlordId: id }, { tenantId: id }] } }),
    prisma.payment.count({ where: { tenantId: id } }),
  ]);

  if (props + leases + pays > 0) {
    redirect(`/master-admin/users?role=${role}&error=has-data`);
  }

  await prisma.user.delete({ where: { id } });
  await audit({ actorId: session.user.id, action: "user.delete", entity: "User", entityId: id });
  revalidatePath("/master-admin/users");
  redirect(`/master-admin/users?role=${role}&deleted=1`);
}
