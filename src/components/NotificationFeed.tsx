import Link from "next/link";

type Item = { id: string; type: string; title: string; body: string | null; read: boolean; createdAt: Date };

// Icon + accent colour per notification type.
const STYLE: Record<string, { icon: string; chip: string }> = {
  payment: { icon: "💳", chip: "bg-emerald-100 text-emerald-600" },
  invoice: { icon: "🧾", chip: "bg-emerald-100 text-emerald-600" },
  maintenance: { icon: "🔧", chip: "bg-amber-100 text-amber-600" },
  complaint: { icon: "📣", chip: "bg-rose-100 text-rose-600" },
  message: { icon: "💬", chip: "bg-blue-100 text-blue-600" },
  chat: { icon: "💬", chip: "bg-blue-100 text-blue-600" },
  property: { icon: "🏠", chip: "bg-indigo-100 text-indigo-600" },
  lease: { icon: "📄", chip: "bg-violet-100 text-violet-600" },
  review: { icon: "⭐", chip: "bg-yellow-100 text-yellow-600" },
  visit: { icon: "📅", chip: "bg-sky-100 text-sky-600" },
  application: { icon: "📨", chip: "bg-fuchsia-100 text-fuchsia-600" },
};
function styleFor(type: string) {
  return STYLE[type] ?? { icon: "🔔", chip: "bg-slate-100 text-slate-500" };
}

function timeAgo(d: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationFeed({ items, href }: { items: Item[]; href: string }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
        <Link href={href} className="text-xs font-medium text-blue-600 hover:text-blue-700">View all →</Link>
      </div>
      {items.length === 0 ? (
        <p className="flex-1 px-4 py-8 text-center text-sm text-slate-400">You&apos;re all caught up 🎉</p>
      ) : (
        <ul className="flex-1 divide-y divide-slate-100">
          {items.map((n) => {
            const s = styleFor(n.type);
            return (
              <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.read ? "" : "bg-blue-50/40"}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${s.chip}`}>{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </div>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
