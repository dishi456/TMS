import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/landlord/blacklist -> tenants this landlord has blacklisted
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const rows = await prisma.blacklist.findMany({
    where: { landlordId: user.id },
    orderBy: { createdAt: "desc" },
    include: { tenant: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
  });
  return json({ items: rows.map((b) => ({ tenantId: b.tenantId, reason: b.reason, createdAt: b.createdAt, tenant: b.tenant })) });
}

const schema = z.object({ tenantId: z.string().min(1), reason: z.string().trim().min(3, "Add a reason for blacklisting.") });

// POST /api/mobile/v1/landlord/blacklist  { tenantId, reason } -> blacklist a managed tenant
export async function POST(req: Request) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const { tenantId, reason } = parsed.data;

  // Only a tenant this landlord manages (directly or via a lease) can be blacklisted.
  const tenant = await prisma.user.findFirst({
    where: { id: tenantId, role: "TENANT", OR: [{ landlordId: user.id }, { tenantLeases: { some: { landlordId: user.id } } }] },
    select: { id: true },
  });
  if (!tenant) return json({ error: "Tenant not found." }, 404);

  await prisma.blacklist.upsert({
    where: { landlordId_tenantId: { landlordId: user.id, tenantId } },
    update: { reason },
    create: { landlordId: user.id, tenantId, reason },
  });
  await audit({ actorId: user.id, action: "tenant.blacklist", entity: "User", entityId: tenantId });
  return json({ ok: true });
}
