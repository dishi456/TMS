"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  senderId: string;
  body: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  readAt: string | null;
  createdAt: string;
  mine: boolean;
};

type Header = {
  leaseNumber: string;
  property: { name: string; photo: string | null };
  other: { name: string; online: boolean };
  signedContractUrl: string | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Per-lease chat: live polling, online presence, read receipts, image attachments.
// Backed by the session-authed /api/lease-chat/{leaseId} route.
export function LeaseChat({ leaseId, header }: { leaseId: string; header: Header }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [info, setInfo] = useState<Header>(header);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const r = await fetch(`/api/lease-chat/${leaseId}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setMessages(d.messages);
        setInfo(d.conversation);
      }
    } catch {
      /* ignore transient poll errors */
    } finally {
      setReady(true);
    }
  }

  // Poll every 4s for new messages + presence (doubles as our heartbeat).
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function post(payload: Record<string, unknown>) {
    const r = await fetch(`/api/lease-chat/${leaseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || "Could not send.");
    }
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    setError(null);
    try {
      await post({ body });
      await load();
    } catch (err) {
      setText(body);
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function sendAttachment(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("purpose", "chat-attachment");
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const ud = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(ud.error || "Upload failed.");
      await post({ attachmentUrl: ud.url, attachmentType: "image" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex h-[72vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header with property + presence */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        {info.property.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.property.photo} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-700">{info.other.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{info.other.name}</p>
          <p className="truncate text-xs text-slate-400">
            {info.property.name} · {info.leaseNumber}
          </p>
        </div>
        <span className={`flex items-center gap-1 text-xs ${info.other.online ? "text-emerald-600" : "text-slate-400"}`}>
          <span className={`h-2 w-2 rounded-full ${info.other.online ? "bg-emerald-500" : "bg-slate-300"}`} />
          {info.other.online ? "Online" : "Offline"}
        </span>
      </div>

      {info.signedContractUrl && (
        <a href={info.signedContractUrl} target="_blank" rel="noreferrer" className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-blue-600 hover:text-blue-700">
          📄 View signed lease contract
        </a>
      )}

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {!ready ? (
          <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-400">No messages yet — say hello 👋</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${m.mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}>
                {m.attachmentUrl && m.attachmentType === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                    <img src={m.attachmentUrl} alt="attachment" className="mb-1 max-h-60 rounded-lg object-cover" />
                  </a>
                )}
                {m.attachmentUrl && m.attachmentType !== "image" && (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={`mb-1 block text-sm underline ${m.mine ? "text-blue-100" : "text-blue-600"}`}>
                    📎 Attachment
                  </a>
                )}
                {m.body && <p className="whitespace-pre-wrap text-sm">{m.body}</p>}
                <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${m.mine ? "text-blue-100" : "text-slate-400"}`}>
                  {fmtTime(m.createdAt)}
                  {m.mine && <span title={m.readAt ? "Read" : "Delivered"}>{m.readAt ? "✓✓" : "✓"}</span>}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}

      {/* Composer */}
      <form onSubmit={sendText} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && sendAttachment(e.target.files[0])} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || sending}
          title="Attach an image"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          {uploading ? "…" : "📎"}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          placeholder={`Message ${info.other.name.split(" ")[0]}…`}
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button disabled={sending || !text.trim()} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
