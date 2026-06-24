import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/tenants → ALL of the landlord's managed tenants
// (by landlordId), so a freshly-added tenant shows up even before they have a
// lease. Returns the `{ tenants: [...] }` envelope the live backend uses.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  const tenants = await prisma.user.findMany({
    where: { role: "TENANT", landlordId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, fullName: true, email: true, phone: true, status: true, verified: true },
  });

  return json({ tenants });
}

// POST /api/mobile/v1/landlord/tenants → landlord adds a tenant.
// Mirrors the website's addTenant action (src/app/landlord/tenants/actions.ts).
const addSchema = z.object({
  fullName: z.string().min(2, "Enter the tenant's full name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().trim().optional(),
  governmentId: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body.");
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message);
  const d = parsed.data;

  try {
    const tenant = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email.toLowerCase(),
        passwordHash: await bcrypt.hash(d.password, 10),
        role: "TENANT",
        status: "ACTIVE",
        landlordId: user.id,
        phone: d.phone && d.phone.length > 0 ? d.phone : null,
        governmentId: d.governmentId && d.governmentId.length > 0 ? d.governmentId : null,
      },
      select: { id: true },
    });
    await audit({ actorId: user.id, action: "tenant.add", entity: "User", entityId: tenant.id });
    return json({ ok: true, id: tenant.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return error("A user with this email already exists.", 409);
    }
    throw e;
  }
}
