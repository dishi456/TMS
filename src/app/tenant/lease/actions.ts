"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

// ---- Give notice to vacate (tenant side) ----
export async function giveNotice(formData: FormData) {
  const session = await requireTenant();
  const id = String(formData.get("id"));
  const lease = await prisma.lease.findFirst({ where: { id, tenantId: session.user.id } });
  if (!lease) redirect("/tenant/lease");
  if ((lease.status === "ACTIVE" || lease.status === "RENEWED") && lease.noticeGivenAt === null) {
    const now = new Date();
    const effective = new Date(now.getTime() + lease.noticePeriodDays * 86400000);
    await prisma.lease.update({
      where: { id },
      data: { noticeGivenAt: now, noticeByParty: "TENANT", noticeEffectiveDate: effective },
    });
    await audit({ actorId: session.user.id, action: "lease.notice", entity: "Lease", entityId: id });
    await notify(lease.landlordId, { type: "lease", title: "Tenant gave notice to vacate", link: "/landlord/leases/" + lease.id });
  }
  revalidatePath("/tenant/lease");
  redirect("/tenant/lease");
}
