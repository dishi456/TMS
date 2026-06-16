import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card, btn } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { formatNumber } from "@/lib/format";
import { timeAgo } from "@/lib/activity";
import { runRemindersNow } from "./actions";
import { TestReminderButton } from "./TestReminderButton";

export const metadata: Metadata = { title: "Rent Automation" };
export const dynamic = "force-dynamic";

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const [openCount, overdueCount, dueSoon, monthInvoices, remindersDelivered, recent] = await Promise.all([
    prisma.invoice.count({ where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.invoice.count({ where: { status: "PENDING", dueDate: { gte: now, lte: in7 } } }),
    prisma.invoice.count({ where: { periodMonth: monthStart } }),
    prisma.notification.count({ where: { type: "rent_reminder" } }),
    prisma.notification.findMany({
      where: { type: "rent_reminder" },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const ran = sp.ran === "1";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Rent Automation</h1>
        <p className="text-sm text-slate-500">
          Auto-generates monthly invoices and sends tiered rent reminders (7 days, 3 days, due date, overdue) by app, email &amp; SMS.
        </p>
      </div>

      {ran && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">Automation run complete.</p>
          <p className="mt-0.5 text-green-700">
            {sp.c} invoice(s) generated · {sp.o} marked overdue · <strong>{sp.r} reminders sent</strong>
            {Number(sp.r) > 0 && <> — 7-day: {sp.t7}, 3-day: {sp.t3}, due-day: {sp.du}, overdue: {sp.od}</>}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="light" label="Open Invoices" value={formatNumber(openCount)} hint="pending + overdue" />
        <StatCard tone="light" label="Overdue" value={formatNumber(overdueCount)} />
        <StatCard tone="light" label="Due in 7 Days" value={formatNumber(dueSoon)} />
        <StatCard tone="light" label="Reminders Sent" value={formatNumber(remindersDelivered)} hint="all time" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Run now</h2>
          <Card>
            <p className="text-sm text-slate-500">
              Manually trigger the scheduled job. It generates this month&apos;s invoices, flags overdue rent, and sends any
              reminders that are due today. Safe to run repeatedly — each reminder fires only once per invoice.
            </p>
            <form action={runRemindersNow} className="mt-4">
              <button className={btn("primary")}>Run reminders now</button>
            </form>
            <p className="mt-3 text-xs text-slate-400">
              In production this runs automatically once a day via the scheduled cron. {monthInvoices} invoice(s) exist for{" "}
              {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
            </p>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-1 text-sm font-medium text-slate-700">Demo: rapid reminders</p>
              <p className="mb-2 text-xs text-slate-400">Sends 3 reminder emails to tenants with open invoices, 10 seconds apart — handy to watch delivery live.</p>
              <TestReminderButton />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Recent reminders delivered</h2>
          <Card>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-400">No reminders sent yet. Click “Run reminders now” to send any that are due.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{n.title}</p>
                      <p className="truncate text-xs text-slate-400">{n.user.fullName}{n.body ? ` · ${n.body}` : ""}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
