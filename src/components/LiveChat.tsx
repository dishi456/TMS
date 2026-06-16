"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; senderId: string; body: string; createdAt: string };

export function LiveChat({
  meId,
  otherId,
  otherName,
}: {
  meId: string;
  otherId: string;
  otherName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [online, setOnline] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch(`/api/messages?with=${otherId}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setMessages(d.messages);
        setOnline(d.online);
      }
    } catch {
      /* ignore transient poll errors */
    } finally {
      setReady(true);
    }
  }

  // Poll every 4s for new messages + presence (also acts as our heartbeat).
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId]);

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
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: otherId, body }),
      });
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header with presence */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {otherName.charAt(0).toUpperCase()}
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">{otherName}</p>
          <p className={`text-xs ${online ? "text-emerald-600" : "text-slate-400"}`}>{online ? "● Online" : "Offline"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {!ready ? (
          <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-400">No messages yet — say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
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
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          placeholder={`Message ${otherName}…`}
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button disabled={sending || !text.trim()} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
