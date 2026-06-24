import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/tenant/profile -> profile + uploaded documents
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, fullName: true, email: true, phone: true, governmentId: true,
      emergencyContact: true, avatarUrl: true, verified: true,
    },
  });
  const docs = await prisma.document.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, fileName: true, createdAt: true },
  });
  return json({ profile: u, documents: docs.map((d) => ({ ...d, url: `/api/files/${d.id}` })) });
}

const schema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  governmentId: z.string().optional(),
  emergencyContact: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// PATCH /api/mobile/v1/tenant/profile  { fullName?, phone?, governmentId?, emergencyContact?, avatarUrl? }
export async function PATCH(req: Request) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  const data = {
    ...(d.fullName !== undefined ? { fullName: d.fullName } : {}),
    ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
    ...(d.governmentId !== undefined ? { governmentId: d.governmentId || null } : {}),
    ...(d.emergencyContact !== undefined ? { emergencyContact: d.emergencyContact || null } : {}),
    ...(d.avatarUrl !== undefined ? { avatarUrl: d.avatarUrl || null } : {}),
  };
  const u = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, fullName: true, phone: true, governmentId: true, emergencyContact: true, avatarUrl: true },
  });
  return json({ ok: true, profile: u });
}
