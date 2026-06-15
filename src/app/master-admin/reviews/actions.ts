"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

// SRS: Remove inappropriate reviews / Flag suspicious ratings (+ restore)
export async function setRatingStatus(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const raw = String(formData.get("status"));
  const status = (["VISIBLE", "FLAGGED", "REMOVED"].includes(raw) ? raw : "VISIBLE") as
    | "VISIBLE"
    | "FLAGGED"
    | "REMOVED";

  await prisma.rating.update({ where: { id }, data: { status } });
  await audit({
    actorId: session.user.id,
    action:
      status === "REMOVED" ? "rating.remove" : status === "FLAGGED" ? "rating.flag" : "rating.restore",
    entity: "Rating",
    entityId: id,
  });

  revalidatePath("/master-admin/reviews");
  revalidatePath(`/master-admin/reviews/${id}`);
  redirect("/master-admin/reviews");
}

// SRS: Suspend review privileges (toggle for a user)
export async function setReviewPrivileges(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId"));
  const suspended = formData.get("suspended") === "true";
  const ratingId = String(formData.get("ratingId") || "");

  await prisma.user.update({ where: { id: userId }, data: { reviewsSuspended: suspended } });
  await audit({
    actorId: session.user.id,
    action: suspended ? "user.reviewSuspend" : "user.reviewRestore",
    entity: "User",
    entityId: userId,
  });

  revalidatePath("/master-admin/reviews");
  if (ratingId) {
    revalidatePath(`/master-admin/reviews/${ratingId}`);
    redirect(`/master-admin/reviews/${ratingId}`);
  }
  redirect("/master-admin/reviews");
}
