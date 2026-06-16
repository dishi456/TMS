import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { sendEmail, emailLayout } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { formatMoney } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Milestone = "T-7" | "T-3" | "DUE" | "OVERDUE";

// Which reminder milestone (if any) applies to an invoice today, by days-to-due.
function milestoneFor(daysUntilDue: number): Milestone | null {
  if (daysUntilDue < 0) return "OVERDUE";
  if (daysUntilDue === 0) return "DUE";
  if (daysUntilDue <= 3) return "T-3";
  if (daysUntilDue <= 7) return "T-7";
  return null; // too far out to remind yet
}

function reminderCopy(m: Milestone, amount: number, property: string, due: Date) {
  const amt = formatMoney(amount);
  const dueStr = due.toLocaleDateString("en-US");
  switch (m) {
    case "T-7":
      return {
        title: "Rent due in 7 days",
        body: `Heads up — rent of ${amt} for ${property} is due on ${dueStr} (in 7 days).`,
        subject: `Reminder: rent for ${property} is due in 7 days`,
        sms: `Lease Lord: Rent ${amt} for ${property} is due ${dueStr} (in 7 days). Pay early to avoid late fees.`,
      };
    case "T-3":
      return {
        title: "Rent due in 3 days",
        body: `Reminder — rent of ${amt} for ${property} is due on ${dueStr} (in 3 days).`,
        subject: `Reminder: rent for ${property} is due in 3 days`,
        sms: `Lease Lord: Rent ${amt} for ${property} is due in 3 days (${dueStr}). Please pay on time.`,
      };
    case "DUE":
      return {
        title: "Rent is due today",
        body: `Your rent of ${amt} for ${property} is due today (${dueStr}).`,
        subject: `Your rent for ${property} is due today`,
        sms: `Lease Lord: Rent ${amt} for ${property} is due TODAY (${dueStr}). Please pay now.`,
      };
    case "OVERDUE":
      return {
        title: "Overdue rent notice",
        body: `Your rent of ${amt} for ${property} is overdue (was due ${dueStr}). Please pay immediately.`,
        subject: `Overdue: rent for ${property}`,
        sms: `Lease Lord: Rent ${amt} for ${property} is OVERDUE (due ${dueStr}). Please pay immediately.`,
      };
  }
}

export type AutomationResult = {
  invoicesCreated: number;
  markedOverdue: number;
  remindersSent: number;
  byMilestone: Record<Milestone, number>;
  ranAt: string;
};

// Daily scheduled tasks. Idempotent — safe to run repeatedly.
export async function runScheduledTasks(): Promise<AutomationResult> {
  const now = new Date();
  const periodMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);

  // 1) Generate this month's invoices for active leases (rent + maintenance fee).
  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] } },
    select: { id: true, monthlyRent: true, maintenanceFee: true },
  });
  let invoicesCreated = 0;
  for (const l of leases) {
    const existing = await prisma.invoice.findUnique({
      where: { leaseId_periodMonth: { leaseId: l.id, periodMonth } },
    });
    if (existing) continue;
    await prisma.invoice.create({
      data: {
        leaseId: l.id,
        periodMonth,
        amount: Number(l.monthlyRent) + Number(l.maintenanceFee ?? 0),
        dueDate,
        status: "PENDING",
      },
    });
    invoicesCreated++;
  }

  // 2) Flag overdue invoices.
  const overdueRes = await prisma.invoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });

  // 3) Tiered rent reminders (T-7, T-3, due day, overdue) across in-app + email + SMS.
  //    Each milestone fires once per invoice (tracked in invoice.remindersSent).
  const open = await prisma.invoice.findMany({
    where: { status: { in: ["PENDING", "OVERDUE"] } },
    include: {
      lease: {
        include: {
          tenant: { select: { id: true, email: true, phone: true, fullName: true } },
          property: { select: { name: true } },
        },
      },
    },
  });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const byMilestone: Record<Milestone, number> = { "T-7": 0, "T-3": 0, DUE: 0, OVERDUE: 0 };

  for (const inv of open) {
    const dueDay = new Date(inv.dueDate.getFullYear(), inv.dueDate.getMonth(), inv.dueDate.getDate());
    const daysUntilDue = Math.round((dueDay.getTime() - startOfToday.getTime()) / DAY_MS);
    const m = milestoneFor(daysUntilDue);
    if (!m || inv.remindersSent.includes(m)) continue;

    const amount = Number(inv.amount);
    const property = inv.lease.property.name;
    const copy = reminderCopy(m, amount, property, inv.dueDate);

    await notify(inv.lease.tenant.id, { type: "rent_reminder", title: copy.title, body: copy.body, link: "/tenant/payments" });
    await sendEmail({
      to: inv.lease.tenant.email,
      subject: copy.subject,
      html: emailLayout(copy.title, `<p>Hi ${inv.lease.tenant.fullName},</p><p>${copy.body}</p><p>You can pay securely from your tenant dashboard.</p>`),
    });
    await sendSms(inv.lease.tenant.phone, copy.sms);

    await prisma.invoice.update({ where: { id: inv.id }, data: { remindersSent: { push: m } } });
    byMilestone[m]++;
  }

  const remindersSent = byMilestone["T-7"] + byMilestone["T-3"] + byMilestone.DUE + byMilestone.OVERDUE;
  return { invoicesCreated, markedOverdue: overdueRes.count, remindersSent, byMilestone, ranAt: now.toISOString() };
}
