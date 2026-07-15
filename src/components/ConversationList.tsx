import Link from "next/link";
import type { Conversation } from "@/lib/chat";

function preview(c: Conversation): string {
  if (!c.lastMessage) return "No messages yet";
  const who = c.lastMessage.mine ? "You: " : "";
  if (c.lastMessage.body) return who + c.lastMessage.body;
  return who + (c.lastMessage.attachmentType === "image" ? "📷 Photo" : "📎 Attachment");
}

// Shared presentational list of per-lease conversations. `basePath` is the
// role's chat root, e.g. "/tenant/chat" or "/landlord/chat".
export function ConversationList({ conversations, basePath }: { conversations: Conversation[]; basePath: string }) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-400">No conversations yet. A chat opens automatically for each active lease.</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {conversations.map((c) => (
        <Link key={c.leaseId} href={`${basePath}/${c.leaseId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
          {c.property.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.property.photo} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-700">{c.other.name.charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">{c.other.name}</p>
              {c.other.online && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Online" />}
            </div>
            <p className="truncate text-xs text-slate-500">{c.property.name}</p>
            <p className="truncate text-xs text-slate-400">{preview(c)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {c.lastMessage && <span className="text-[10px] text-slate-400">{new Date(c.lastMessage.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            {c.unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{c.unread}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
