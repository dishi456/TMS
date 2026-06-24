import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/tenants -> ALL tenants this landlord manages
// (by landlordId), so a freshly-added tenant shows even before they have a lease.
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const rows = await prisma.user.findMany({
    where: { role: "TENANT", landlordId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      verified: true,
      tenantLeases: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, property: { select: { id: true, name: true } } },
      },
    },
  });
  const tenants = rows.map((t) => ({
    id: t.id,
    fullName: t.fullName,
    email: t.email,
    phone: t.phone,
    status: t.status,
    verified: t.verified,
    leaseId: t.tenantLeases[0]?.id ?? null,
    leaseStatus: t.tenantLeases[0]?.status ?? null,
    // app renders this as a string; null when no lease yet
    property: t.tenantLeases[0]?.property?.name ?? null,
  }));
  return json({ tenants });
}

// POST /api/mobile/v1/landlord/tenants -> landlord adds a tenant (mirrors web addTenant)
const addSchema = z.object({
  fullName: z.string().min(2, "Enter the tenant's full name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().trim().optional(),
  governmentId: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
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
      return json({ error: "A user with this email already exists." }, 409);
    }
    throw e;
  }
}
