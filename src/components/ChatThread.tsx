import { sendMessage } from "@/app/actions/messages";

export type ChatMessage = { id: string; senderId: string; body: string; createdAt: Date };

export function ChatThread({
  messages,
  meId,
  recipientId,
  recipientName,
  back,
}: {
  messages: ChatMessage[];
  meId: string;
  recipientId: string;
  recipientName: string;
  back: string;
}) {
  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-400">No messages yet — say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}>
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
                    {m.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={sendMessage} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input type="hidden" name="recipientId" value={recipientId} />
        <input type="hidden" name="back" value={back} />
        <input
          name="body"
          required
          autoComplete="off"
          placeholder={`Message ${recipientName}…`}
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">Send</button>
      </form>
    </div>
  );
}
