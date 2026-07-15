import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";
import { removeFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  label: z.string().trim().optional(),
  docNumber: z.string().trim().optional(),
  expiryDate: z.string().optional(),
});

// PATCH /api/mobile/v1/tenant/documents/{id} -> set type/number/expiry (owned)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const { id } = await ctx.params;
  const owns = await prisma.document.findFirst({ where: { id, ownerId: user.id }, select: { id: true } });
  if (!owns) return json({ error: "Not found." }, 404);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  const d = parsed.data;
  await prisma.document.update({
    where: { id },
    data: {
      ...(d.label !== undefined ? { label: d.label } : {}),
      ...(d.docNumber !== undefined ? { docNumber: d.docNumber || null } : {}),
      ...(d.expiryDate !== undefined ? { expiryDate: d.expiryDate ? new Date(d.expiryDate) : null } : {}),
    },
  });
  return json({ ok: true });
}

// DELETE /api/mobile/v1/tenant/documents/{id} -> remove the document + file (owned)
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireMobile(req, "TENANT");
  if (res) return res;
  const { id } = await ctx.params;
  const doc = await prisma.document.findFirst({ where: { id, ownerId: user.id }, select: { id: true, storageKey: true } });
  if (!doc) return json({ error: "Not found." }, 404);
  await prisma.document.delete({ where: { id } });
  if (doc.storageKey) { try { await removeFile(doc.storageKey); } catch { /* ignore */ } }
  return json({ ok: true });
}
