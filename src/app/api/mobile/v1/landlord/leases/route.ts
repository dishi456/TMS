import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/leases
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const leases = await prisma.lease.findMany({
    where: { landlordId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, name: true } }, tenant: { select: { id: true, fullName: true, email: true } } },
  });
  return json({
    leases: leases.map((l) => ({
      id: l.id, status: l.status, monthlyRent: Number(l.monthlyRent), securityDeposit: Number(l.securityDeposit),
      startDate: l.startDate, endDate: l.endDate, property: l.property, tenant: l.tenant,
    })),
  });
}

const createSchema = z.object({
  tenantId: z.string().min(1, "Choose a tenant."),
  propertyId: z.string().min(1, "Choose a property."),
  monthlyRent: z.coerce.number().positive("Enter the monthly rent."),
  securityDeposit: z.coerce.number().nonnegative().default(0),
  maintenanceFee: z.coerce.number().nonnegative().optional(),
  startDate: z.string().min(1, "Pick a start date."),
  endDate: z.string().min(1, "Pick an end date."),
  noticePeriodDays: z.coerce.number().int().min(0).max(365).default(30),
  terms: z.string().optional(),
});

// POST /api/mobile/v1/landlord/leases -> create an active lease for one of the
// landlord's tenants on one of their properties (marks the unit occupied).
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;

  const start = new Date(d.startDate);
  const end = new Date(d.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return json({ error: "Invalid dates." }, 400);
  if (end <= start) return json({ error: "End date must be after the start date." }, 400);

  const property = await prisma.property.findFirst({ where: { id: d.propertyId, landlordId: user.id }, select: { id: true } });
  if (!property) return json({ error: "Property not found." }, 404);
  const tenant = await prisma.user.findFirst({
    where: { id: d.tenantId, role: "TENANT", OR: [{ landlordId: user.id }, { tenantLeases: { some: { landlordId: user.id } } }] },
    select: { id: true },
  });
  if (!tenant) return json({ error: "Tenant not found — add the tenant first." }, 404);

  const lease = await prisma.lease.create({
    data: {
      propertyId: d.propertyId, landlordId: user.id, tenantId: d.tenantId,
      startDate: start, endDate: end, monthlyRent: d.monthlyRent, securityDeposit: d.securityDeposit,
      maintenanceFee: d.maintenanceFee ?? null, noticePeriodDays: d.noticePeriodDays,
      terms: d.terms || null, status: "ACTIVE",
    },
    select: { id: true },
  });
  await prisma.property.update({ where: { id: d.propertyId }, data: { availability: "OCCUPIED" } });
  // Raise the first month's invoice so it shows up in rent tracking immediately.
  const periodMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const dueDate = new Date(start.getFullYear(), start.getMonth(), 5);
  await prisma.invoice.create({ data: { leaseId: lease.id, periodMonth, amount: d.monthlyRent, dueDate, status: "PENDING" } }).catch(() => {});
  await audit({ actorId: user.id, action: "lease.create", entity: "Lease", entityId: lease.id });
  await notify(d.tenantId, { type: "lease", title: "New lease created", body: "A lease has been set up for you. Tap to view.", link: "/tenant/lease" });
  return json({ ok: true, id: lease.id });
}
