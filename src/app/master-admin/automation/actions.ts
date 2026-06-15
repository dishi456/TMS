"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { runScheduledTasks } from "@/lib/automation";

export async function runRemindersNow() {
  const session = await requireAdmin();
  const r = await runScheduledTasks();
  await audit({
    actorId: session.user.id,
    action: "automation.run",
    entity: "Automation",
    metadata: { ...r },
  });

  const qs = new URLSearchParams({
    ran: "1",
    c: String(r.invoicesCreated),
    o: String(r.markedOverdue),
    r: String(r.remindersSent),
    t7: String(r.byMilestone["T-7"]),
    t3: String(r.byMilestone["T-3"]),
    du: String(r.byMilestone.DUE),
    od: String(r.byMilestone.OVERDUE),
  });
  revalidatePath("/master-admin/automation");
  redirect(`/master-admin/automation?${qs.toString()}`);
}
