import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]) });

// PATCH /api/mobile/v1/landlord/applications/{id}  { decision }
// Approve -> onboard the applicant as a managed tenant, open an active lease,
// and mark the unit occupied. Reject -> just close it. Both email the applicant.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "LANDLORD");
  if (res) return res;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const decision = parsed.data.decision;

  const app = await prisma.application.findFirst({
    where: { id, property: { landlordId: user.id } },
    include: {
      property: {
        select: { id: true, name: true, rentAmount: true, securityDeposit: true, noticePeriodDays: true, landlordId: true },
      },
    },
  });
  if (!app) return json({ error: "Not found." }, 404);

  await prisma.application.update({ where: { id }, data: { status: decision } });
  await audit({ actorId: user.id, action: `application.${decision.toLowerCase()}`, entity: "Application", entityId: id });

  let leaseCreated = false;
  if (decision === "APPROVED") {
    leaseCreated = await onboardTenant(app, user.id);
  }

  await sendEmail({
    to: app.email,
    subject: decision === "APPROVED" ? `Your application for ${app.property.name} was approved` : `Update on your application for ${app.property.name}`,
    html: emailLayout(
      decision === "APPROVED" ? "Application approved" : "Application update",
      decision === "APPROVED"
        ? `<p>Good news, ${app.fullName}! Your application for <strong>${app.property.name}</strong> was approved.${leaseCreated ? " A lease has been set up — sign in to the app to view it." : ""}</p>`
        : `<p>Hi ${app.fullName}, your application for <strong>${app.property.name}</strong> wasn't successful this time.</p>`,
    ),
  });
  return json({ ok: true, leaseCreated });
}

type AppRow = {
  email: string; fullName: string; phone: string | null;
  property: { id: string; rentAmount: unknown; securityDeposit: unknown; noticePeriodDays: number };
};

// Find-or-create the applicant as a TENANT managed by this landlord, then open
// an active lease (idempotent: skips if an active lease already exists). Returns
// whether a lease was created. Never throws into the request — best-effort.
async function onboardTenant(app: AppRow, landlordId: string): Promise<boolean> {
  try {
    const email = app.email.trim().toLowerCase();
    let tenant = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, landlordId: true } });

    if (tenant) {
      // Can't convert a landlord/admin account into someone's tenant.
      if (tenant.role !== "TENANT" && tenant.role !== "USER") return false;
      await prisma.user.update({
        where: { id: tenant.id },
        data: { role: "TENANT", ...(tenant.landlordId ? {} : { landlordId }) },
      });
    } else {
      tenant = await prisma.user.create({
        data: {
          fullName: app.fullName,
          email,
          // Random password — the tenant sets their own via "forgot password".
          passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10),
          role: "TENANT",
          status: "ACTIVE",
          landlordId,
          phone: app.phone || null,
        },
        select: { id: true, role: true, landlordId: true },
      });
    }

    // Don't double-create a lease for the same tenant + property.
    const existing = await prisma.lease.findFirst({
      where: { tenantId: tenant.id, propertyId: app.property.id, status: { in: ["DRAFT", "ACTIVE", "RENEWED"] } },
      select: { id: true },
    });
    if (existing) return false;

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 11); // standard 11-month term

    const lease = await prisma.lease.create({
      data: {
        propertyId: app.property.id,
        landlordId,
        tenantId: tenant.id,
        startDate: start,
        endDate: end,
        monthlyRent: app.property.rentAmount as never,
        securityDeposit: app.property.securityDeposit as never,
        status: "ACTIVE",
        noticePeriodDays: app.property.noticePeriodDays ?? 30,
      },
      select: { id: true },
    });
    await prisma.property.update({ where: { id: app.property.id }, data: { availability: "OCCUPIED" } });
    await audit({ actorId: landlordId, action: "lease.create", entity: "Lease", entityId: lease.id });
    await notify(tenant.id, { type: "lease", title: "Your lease is ready", body: "A lease has been set up for you.", link: "/tenant/lease" });
    return true;
  } catch {
    // Approval already succeeded; lease setup is best-effort.
    return false;
  }
}
