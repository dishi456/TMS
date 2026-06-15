import Link from "next/link";
import { Card, btn } from "@/components/ui";
import { timeAgo } from "@/lib/activity";
import { PushToggle } from "@/components/PushToggle";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";

type N = { id: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: Date };

// Reusable notifications feed for any role. `back` is the current path (used
// to revalidate after marking read).
export function NotificationList({ notifications, back }: { notifications: N[]; back: string }) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Notifications</h1>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <input type="hidden" name="back" value={back} />
            <button className={btn("secondary")}>Mark all read</button>
          </form>
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
                <form action={markNotificationRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="back" value={back} />
                  <button className="text-xs text-blue-600 hover:text-blue-700">Mark read</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
