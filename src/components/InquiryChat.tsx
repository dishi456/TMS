"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; fromGuest: boolean; body: string; createdAt: string };

export function InquiryChat({ inquiryId, guestName }: { inquiryId: string; guestName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch(`/api/landlord/inquiries/${inquiryId}`, { cache: "no-store" });
      if (r.ok) setMessages((await r.json()).messages);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 4000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      await fetch(`/api/landlord/inquiries/${inquiryId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[65vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = !m.fromGuest; // landlord's own messages on the right
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
                  {new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" placeholder={`Reply to ${guestName}…`} className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        <button disabled={sending || !text.trim()} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
