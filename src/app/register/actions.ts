"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout, APP_NAME } from "@/lib/email";
import { consumeVerifyToken } from "@/lib/otp";

export type RegisterState = { error?: string } | undefined;

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  // USER = a public seeker (browse/save/chat); LANDLORD = lists properties.
  // Tenants are created by a landlord (add or convert), not via self-signup.
  role: z.enum(["LANDLORD", "USER"]),
  otpToken: z.string().min(1, "Please verify your email."),
});

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // Email must have been verified via OTP (token burned here so it's single-use).
  const verified = await consumeVerifyToken(d.email, d.otpToken, "register");
  if (!verified) return { error: "Your email verification expired. Please verify again." };

  // Seekers are active immediately; landlords await admin approval.
  const isUser = d.role === "USER";

  try {
    const user = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email.toLowerCase(),
        passwordHash: await bcrypt.hash(d.password, 10),
        role: d.role,
        status: isUser ? "ACTIVE" : "PENDING",
        landlordId: null,
      },
    });
    await audit({
      actorId: user.id,
      action: isUser ? "register.user" : "register.landlord",
      entity: "User",
      entityId: user.id,
    });
    await sendEmail({
      to: user.email,
      subject: `Welcome to ${APP_NAME}`,
      html: emailLayout(
        `Welcome, ${user.fullName}`,
        isUser
          ? `<p>Your account is ready. Browse properties, save your favourites and chat with owners directly.</p>
             <p>When you rent a place, your landlord can upgrade you to a tenant account with rent, maintenance and more.</p>`
          : `<p>Your landlord account has been created and is awaiting approval.</p>
             <p>You can sign in now — full access unlocks once you're approved.</p>`,
      ),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "An account with this email already exists." };
    }
    throw e;
  }

  redirect(isUser ? "/login?registered=1&seeker=1" : "/login?registered=1");
}
