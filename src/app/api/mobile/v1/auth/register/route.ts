import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeVerifyToken } from "@/lib/otp";
import { signMobileToken, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["USER", "LANDLORD"]),
  country: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  otpToken: z.string().min(1),
});

const CURRENCIES = ["USD", "AUD", "CAD", "GBP", "EUR", "INR"];

// POST /api/mobile/v1/auth/register
// Self-signup for seekers (USER) and landlords (LANDLORD). Email must be verified
// first: app calls /api/otp/send {purpose:"register"} then /api/otp/verify to get otpToken.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  const email = d.email.toLowerCase();

  const verified = await consumeVerifyToken(email, d.otpToken, "register");
  if (!verified) return json({ error: "Email verification expired. Verify again." }, 400);

  const isUser = d.role === "USER";
  try {
    const user = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email,
        passwordHash: await bcrypt.hash(d.password, 10),
        role: d.role,
        status: isUser ? "ACTIVE" : "PENDING",
        prefCountry: d.country || null,
        currency: d.currency && CURRENCIES.includes(d.currency) ? d.currency : null,
      },
    });
    const token = await signMobileToken({ id: user.id, role: user.role });
    return json({
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return json({ error: "An account with this email already exists." }, 409);
    }
    throw e;
  }
}
