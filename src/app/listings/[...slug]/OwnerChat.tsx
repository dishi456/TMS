"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; fromGuest: boolean; body: string; createdAt: string };
type Lead = { name: string; phone: string; email: string; message: string };

export function OwnerChat({ propertyId, loggedIn = false }: { propertyId: string; loggedIn?: boolean }) {
  const storageKey = `inquiry:${propertyId}`;
  const [token, setToken] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lead-capture → email OTP → chat.
  const [step, setStep] = useState<"lead" | "otp">("lead");
  const [lead, setLead] = useState<Lead | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

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

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) return;
    const i = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, [resendIn]);

  // Step 1 → request an email OTP.
  async function requestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const next: Lead = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
    };
    setSendingOtp(true);
    try {
      const r = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: next.email, purpose: "chat" }),
      });
      if (!r.ok) {
        setError(await r.text());
        return;
      }
      setLead(next);
      setStep("otp");
      setCode("");
      setResendIn(30);
    } catch {
      setError("Couldn't send the code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  // Logged-in fast path: no OTP — the server trusts the session and fills
  // name/email itself.
  async function startLoggedIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    setVerifying(true);
    try {
      const r = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, phone: fd.get("phone"), message: fd.get("message") }),
      });
      if (!r.ok) {
        setError(await r.text());
        return;
      }
      const { token: t } = await r.json();
      localStorage.setItem(storageKey, t);
      setToken(t);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function resendOtp() {
    if (!lead || resendIn > 0) return;
    setError(null);
    const r = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lead.email, purpose: "chat" }),
    });
    if (!r.ok) setError(await r.text());
    else setResendIn(30);
  }

  // Step 2 → verify the code, then create the inquiry.
  async function verifyAndStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lead) return;
    setError(null);
    setVerifying(true);
    try {
      const v = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lead.email, code, purpose: "chat" }),
      });
      if (!v.ok) {
        setError(await v.text());
        return;
      }
      const { verifyToken } = await v.json();

      const r = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, ...lead, otpToken: verifyToken }),
      });
      if (!r.ok) {
        setError(await r.text());
        return;
      }
      const { token: t } = await r.json();
      localStorage.setItem(storageKey, t);
      setToken(t);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
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

  // --- Logged-in lead form (no OTP needed) ---
  if (!token && loggedIn) {
    return (
      <form onSubmit={startLoggedIn} className="space-y-3">
        <p className="text-sm text-slate-500">You&apos;re signed in — just add a phone number the owner can reach you on.</p>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Phone</span><input name="phone" required className={input} placeholder="+1 555 000 0000" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Message</span><textarea name="message" rows={2} className={input} placeholder="Is this still available? Can I see it this weekend?" /></label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={verifying} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {verifying ? "Starting…" : "💬 Start chat with owner"}
        </button>
      </form>
    );
  }

  // --- Lead form (no conversation yet) ---
  if (!token && step === "lead") {
    return (
      <form onSubmit={requestOtp} className="space-y-3">
        <p className="text-sm text-slate-500">Message the owner directly. We&apos;ll email you a code to verify it&apos;s you.</p>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Your name</span><input name="name" required minLength={2} className={input} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Phone</span><input name="phone" required className={input} placeholder="+1 555 000 0000" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Email</span><input name="email" type="email" required className={input} placeholder="you@example.com" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-slate-600">Message</span><textarea name="message" rows={2} className={input} placeholder="Is this still available? Can I see it this weekend?" /></label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={sendingOtp} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {sendingOtp ? "Sending code…" : "Continue"}
        </button>
      </form>
    );
  }

  // --- OTP step ---
  if (!token && step === "otp" && lead) {
    return (
      <form onSubmit={verifyAndStart} className="space-y-3">
        <button type="button" onClick={() => { setStep("lead"); setError(null); }} className="text-xs text-slate-400 hover:text-slate-600">← Edit details</button>
        <p className="text-sm text-slate-600">Enter the 6-digit code we emailed to <span className="font-medium text-slate-800">{lead.email}</span>.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          placeholder="••••••"
          className={`${input} text-center text-lg font-semibold tracking-[0.5em]`}
        />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={verifying || code.length !== 6} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {verifying ? "Verifying…" : "Verify & start chat"}
        </button>
        <button type="button" onClick={resendOtp} disabled={resendIn > 0} className="w-full text-center text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50">
          {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
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
        <button onClick={() => { localStorage.removeItem(storageKey); setToken(null); setMessages([]); setStep("lead"); setLead(null); }} className="text-xs text-slate-400 hover:text-slate-600">New enquiry</button>
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
