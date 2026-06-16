"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; fromGuest: boolean; body: string; createdAt: string };

export function OwnerChat({ propertyId }: { propertyId: string }) {
  const storageKey = `inquiry:${propertyId}`;
  const [token, setToken] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [landlordName, setLandlordName] = useState("Owner");
  const [online, setOnline] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Restore an existing conversation for this property from the browser.
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    setToken(t);
    setBooted(true);
  }, [storageKey]);

  async function load(t: string) {
    try {
      const r = await fetch(`/api/inquiries/${t}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setMessages(d.messages);
        setLandlordName(d.landlordName);
        setOnline(d.online);
      } else if (r.status === 404) {
        localStorage.removeItem(storageKey);
        setToken(null);
      }
    } catch {
      /* ignore transient poll errors */
    }
  }

  // Poll while a conversation is open.
  useEffect(() => {
    if (!token) return;
    load(token);
    const i = setInterval(() => load(token), 4000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStarting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          message: fd.get("message"),
        }),
      });
      if (!r.ok) {
        setError(await r.text());
        return;
      }
      const { token: t } = await r.json();
      localStorage.setItem(storageKey, t);
      setToken(t);
    } finally {
      setStarting(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !token || sending) return;
    setSending(true);
    setText("");
    try {
      await fetch(`/api/inquiries/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      await load(token);
    } finally {
      setSending(false);
    }
  }

  const input = "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  if (!booted) return null;

  // --- Lead form (no conversation yet) ---
  if (!token) {
    return (
      <form onSubmit={start} className="space-y-3">
        <p className="text-sm text-slate-500">Message the owner directly — just your name &amp; phone.</p>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Your name</span><input name="name" required minLength={2} className={input} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Phone</span><input name="phone" required className={input} placeholder="+1 555 000 0000" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Email (optional)</span><input name="email" type="email" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Message</span><textarea name="message" rows={2} className={input} placeholder="Is this still available? Can I see it this weekend?" /></label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={starting} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {starting ? "Starting…" : "💬 Start chat with owner"}
        </button>
      </form>
    );
  }

  // --- Live chat ---
  return (
    <div className="flex h-[60vh] flex-col overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-800">Chat with {landlordName.split(" ")[0]}</p>
            <p className={`text-[11px] leading-tight ${online ? "text-emerald-600" : "text-slate-400"}`}>{online ? "Online" : "Offline"}</p>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem(storageKey); setToken(null); setMessages([]); }} className="text-xs text-slate-400 hover:text-slate-600">New enquiry</button>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.map((m) => {
          const mine = m.fromGuest;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{new Date(m.createdAt).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        <button disabled={sending || !text.trim()} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
