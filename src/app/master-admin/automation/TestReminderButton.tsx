"use client";

import { useState } from "react";
import { sendOneReminderRound } from "./actions";

export function TestReminderButton() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setStatus("Sending round 1 of 3…");
    try {
      let total = 0;
      for (let round = 1; round <= 3; round++) {
        const { sent } = await sendOneReminderRound(round);
        total += sent;
        setStatus(`Round ${round}/3 sent (${sent} email${sent === 1 ? "" : "s"})${round < 3 ? " — next in 10s…" : ""}`);
        if (round < 3) await new Promise((r) => setTimeout(r, 10_000));
      }
      setStatus(`✓ Done — sent 3 rounds (${total} emails total), 10 seconds apart.`);
    } catch {
      setStatus("Something went wrong sending the test reminders.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={running}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        {running ? "Sending…" : "Send 3 test reminders (10s apart)"}
      </button>
      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
    </div>
  );
}
