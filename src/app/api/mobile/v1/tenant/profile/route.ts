import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/profile → full profile + uploaded documents.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      governmentId: true,
      emergencyContact: true,
      avatarUrl: true,
      verified: true,
      status: true,
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, fileName: true, label: true, createdAt: true },
      },
    },
  });
  if (!me) return error("Not found", 404);

  return json({
    id: me.id,
    fullName: me.fullName,
    email: me.email,
    phone: me.phone,
    governmentId: me.governmentId,
    emergencyContact: me.emergencyContact,
    avatarUrl: me.avatarUrl,
    verified: me.verified,
    status: me.status,
    documents: me.documents.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      label: d.label,
      url: `/api/files/${d.id}`,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
  governmentId: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional(),
});

// PATCH /api/mobile/v1/tenant/profile → update editable fields.
export async function PATCH(req: Request) {
  const user = await requireMobileUser(req, ["TENANT"]);
  if (user instanceof Response) return user;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(d.fullName !== undefined ? { fullName: d.fullName } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.emergencyContact !== undefined ? { emergencyContact: d.emergencyContact || null } : {}),
      ...(d.governmentId !== undefined ? { governmentId: d.governmentId || null } : {}),
      ...(d.avatarUrl !== undefined ? { avatarUrl: d.avatarUrl || null } : {}),
    },
    select: { id: true, fullName: true, phone: true, emergencyContact: true, governmentId: true, avatarUrl: true },
  });

  return json({ ok: true, profile: updated });
}
