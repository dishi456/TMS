import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout, APP_NAME } from "@/lib/email";
import { consumeVerifyToken } from "@/lib/otp";
import { signMobileToken, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Self-signup is for USER (property seeker) and LANDLORD only — tenants are
// created by a landlord. Mirrors src/app/register/actions.ts.
const schema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["LANDLORD", "USER"]),
  otpToken: z.string().min(1, "Please verify your email."),
});

// POST /api/mobile/v1/auth/register → { token, user }
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  // Email must have been verified via OTP (purpose "register"); token is burned.
  const verified = await consumeVerifyToken(d.email, d.otpToken, "register");
  if (!verified) return error("Your email verification expired. Please verify again.", 403);

  const isUser = d.role === "USER"; // seekers active immediately; landlords await approval

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
          ? `<p>Your account is ready. Browse properties, save your favourites and chat with owners directly.</p>`
          : `<p>Your landlord account has been created and is awaiting approval. You can sign in now — full access unlocks once you're approved.</p>`,
      ),
    });

    const token = signMobileToken(user.id, user.role);
    return json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return error("An account with this email already exists.", 409);
    }
    throw e;
  }
}
