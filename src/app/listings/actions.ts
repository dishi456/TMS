"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export type ApplyState = { error?: string; success?: boolean } | undefined;

const schema = z.object({
  propertyId: z.string().min(1),
  fullName: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, approved: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return { error: "This property is not available for applications." };

  await prisma.application.create({
    data: {
      propertyId: property.id,
      fullName: d.fullName,
      email: d.email.toLowerCase(),
      phone: d.phone || null,
      message: d.message || null,
      status: "PENDING",
    },
  });

  // Notify the property's landlord (+ all admins) of the new lead.
  await notify(property.landlordId, {
    type: "application",
    title: "New rental application",
    body: `${d.fullName} applied for ${property.name}.`,
    link: "/landlord/applications",
  });
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: "application", title: "New rental application", body: `${d.fullName} applied for ${property.name}.` });
  }

  revalidatePath("/landlord/applications");
  return { success: true };
}

// ---- Schedule a visit ----------------------------------------------------

export type VisitState = { error?: string; success?: boolean } | undefined;

const visitSchema = z.object({
  propertyId: z.string().min(1),
  fullName: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  preferredAt: z.string().min(1, "Pick a preferred date & time."),
  message: z.string().trim().optional(),
});

export async function requestVisit(_prev: VisitState, formData: FormData): Promise<VisitState> {
  const parsed = visitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const when = new Date(d.preferredAt);
  if (Number.isNaN(when.getTime())) return { error: "Invalid date & time." };
  if (when.getTime() < Date.now()) return { error: "Pick a future date & time." };

  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, approved: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return { error: "This property is not available for visits." };

  await prisma.visit.create({
    data: {
      propertyId: property.id,
      fullName: d.fullName,
      email: d.email.toLowerCase(),
      phone: d.phone || null,
      preferredAt: when,
      message: d.message || null,
      status: "PENDING",
    },
  });

  const whenStr = when.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  await notify(property.landlordId, {
    type: "visit",
    title: "New visit request",
    body: `${d.fullName} wants to tour ${property.name} on ${whenStr}.`,
    link: "/landlord/visits",
  });
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: "visit", title: "New visit request", body: `${d.fullName} requested a tour of ${property.name}.` });
  }

  revalidatePath("/landlord/visits");
  return { success: true };
}
