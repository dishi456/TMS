// Lightweight SMS sender via the Twilio REST API (no SDK dependency).
// Gracefully degrades to a console log when Twilio isn't configured, so the
// rest of the app works in development without credentials.

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM;

export function smsConfigured(): boolean {
  return !!(SID && TOKEN && FROM);
}

export async function sendSms(to: string | null | undefined, body: string): Promise<boolean> {
  if (!to) return false;

  if (!smsConfigured()) {
    console.log(`[sms:dev] → ${to}: ${body}`);
    return true; // treated as "delivered" in dev so reminder flow continues
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: FROM!, Body: body }),
    });
    if (!res.ok) {
      console.error("sendSms failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendSms error:", e);
    return false;
  }
}
