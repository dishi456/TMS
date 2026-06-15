import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, btn } from "@/components/ui";
import { timeAgo } from "@/lib/activity";
import { PushToggle } from "@/components/PushToggle";
import { markRead, markAllRead } from "./actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function TenantNotificationsPage() {
  const session = await auth();
  const tenantId = session!.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId: tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Notifications</h1>
        {unread > 0 && (
          <form action={markAllRead}><button className={btn("secondary")}>Mark all read</button></form>
        )}
      </div>

      <PushToggle />

      {notifications.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No notifications yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start justify-between gap-3 rounded-xl border p-4 shadow-sm ${n.read ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                <div>
                  <p className="font-medium text-slate-800">{n.title}</p>
                  {n.body && <p className="text-sm text-slate-500">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                  {n.link && <Link href={n.link} className="text-xs font-medium text-blue-600 hover:text-blue-700">Open →</Link>}
                </div>
              </div>
              {!n.read && (
                <form action={markRead}><input type="hidden" name="id" value={n.id} /><button className="text-xs text-blue-600 hover:text-blue-700">Mark read</button></form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
