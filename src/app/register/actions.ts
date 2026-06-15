"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout } from "@/lib/email";

export type RegisterState = { error?: string } | undefined;

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["LANDLORD", "TENANT"]),
  landlordId: z.string().optional(),
});

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // A tenant must choose the landlord who will approve & manage them.
  if (d.role === "TENANT") {
    if (!d.landlordId) return { error: "Please select your landlord." };
    const ll = await prisma.user.findFirst({
      where: { id: d.landlordId, role: "LANDLORD", status: "ACTIVE" },
    });
    if (!ll) return { error: "Selected landlord is not available." };
  }

  try {
    const user = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email.toLowerCase(),
        passwordHash: await bcrypt.hash(d.password, 10),
        role: d.role,
        status: "PENDING", // awaiting approval (admin for landlords, landlord for tenants)
        landlordId: d.role === "TENANT" ? d.landlordId : null,
      },
    });
    await audit({
      actorId: user.id,
      action: d.role === "LANDLORD" ? "register.landlord" : "register.tenant",
      entity: "User",
      entityId: user.id,
    });
    await sendEmail({
      to: user.email,
      subject: "Welcome to Tenant Management System",
      html: emailLayout(
        `Welcome, ${user.fullName}`,
        `<p>Your ${d.role === "LANDLORD" ? "landlord" : "tenant"} account has been created and is awaiting approval.</p>
         <p>You can sign in now — full access unlocks once you're approved.</p>`,
      ),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "An account with this email already exists." };
    }
    throw e;
  }

  redirect("/login?registered=1");
}
