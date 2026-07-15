import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// PATCH /api/mobile/v1/account/profile  { fullName?, phone?, avatarUrl? }
// Self-service profile edit for seekers (USER) and tenants.
export async function PATCH(req: Request) {
  const { user, res } = await requireMobile(req, ["USER", "TENANT"]);
  if (res) return res;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  const data = {
    ...(d.fullName !== undefined ? { fullName: d.fullName } : {}),
    ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
    ...(d.avatarUrl !== undefined ? { avatarUrl: d.avatarUrl || null } : {}),
  };
  const u = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
  });
  return json({ ok: true, profile: u });
}
