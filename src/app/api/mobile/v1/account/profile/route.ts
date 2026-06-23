import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional(),
});

// PATCH /api/mobile/v1/account/profile → update the USER's own account.
export async function PATCH(req: Request) {
  const user = await requireMobileUser(req, ["USER"]);
  if (user instanceof Response) return user;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);
  const d = parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(d.fullName !== undefined ? { fullName: d.fullName } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.avatarUrl !== undefined ? { avatarUrl: d.avatarUrl || null } : {}),
    },
    select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true },
  });

  return json({ ok: true, profile: updated });
}
