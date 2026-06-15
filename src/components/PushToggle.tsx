"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "unconfigured" | "subscribed" | "idle" | "denied" | "working";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!VAPID_PUBLIC) return setState("unconfigured");
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return setState("unsupported");
    }
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "idle"))
      .catch(() => setState("idle"));
  }, []);

  async function enable() {
    try {
      setState("working");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "idle");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState(res.ok ? "subscribed" : "idle");
    } catch {
      setState("idle");
    }
  }

  async function disable() {
    try {
      setState("working");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("subscribed");
    }
  }

  if (state === "loading" || state === "unconfigured") return null;

  const box = "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm";

  if (state === "unsupported") {
    return (
      <div className={box}>
        <span className="text-sm text-slate-500">🔔 Push notifications aren’t supported on this browser.</span>
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className={box}>
        <span className="text-sm text-slate-500">🔕 Notifications are blocked. Enable them in your browser settings to get alerts.</span>
      </div>
    );
  }

  const subscribed = state === "subscribed";
  return (
    <div className={box}>
      <div>
        <p className="text-sm font-medium text-slate-800">Push notifications</p>
        <p className="text-xs text-slate-400">
          {subscribed ? "On — you’ll get alerts even when the app is closed." : "Get rent reminders & updates on this device."}
        </p>
      </div>
      <button
        onClick={subscribed ? disable : enable}
        disabled={state === "working"}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          subscribed ? "border border-slate-300 text-slate-600 hover:bg-slate-50" : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {state === "working" ? "…" : subscribed ? "Turn off" : "Enable"}
      </button>
    </div>
  );
}
