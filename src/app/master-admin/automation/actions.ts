"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { sendEmail, emailLayout } from "@/lib/email";
import { formatMoney } from "@/lib/format";
import { runScheduledTasks } from "@/lib/automation";

// Demo: send ONE round of rent-reminder emails to tenants with open invoices.
// The UI calls this 3 times ~10s apart so you can watch emails arrive.
export async function sendOneReminderRound(round: number): Promise<{ sent: number }> {
  await requireAdmin();
  const open = await prisma.invoice.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] } },
    include: { lease: { include: { tenant: { select: { id: true, email: true, fullName: true } }, property: { select: { name: true } } } } },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  let sent = 0;
  for (const inv of open) {
    const amt = formatMoney(inv.amount);
    const prop = inv.lease.property.name;
    await sendEmail({
      to: inv.lease.tenant.email,
      subject: `Rent reminder ${round}/3 — ${prop}`,
      html: emailLayout(
        `Rent reminder (${round} of 3)`,
        `<p>Hi ${inv.lease.tenant.fullName},</p><p>This is reminder <strong>${round} of 3</strong> that your rent of <strong>${amt}</strong> for ${prop} is due. Please pay from your tenant dashboard.</p>`,
      ),
    });
    await notify(inv.lease.tenant.id, { type: "rent_reminder", title: `Rent reminder ${round}/3`, body: `Your rent of ${amt} for ${prop} is due.`, link: "/tenant/payments" });
    sent++;
  }
  return { sent };
}

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
