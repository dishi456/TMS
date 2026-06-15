import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export const RAZORPAY_KEY_ID = keyId ?? "";

export function razorpayConfigured(): boolean {
  return !!(keyId && keySecret);
}

// Returns a Razorpay client, or null when keys aren't configured (the app then
// falls back to the simulated payment flow).
export function getRazorpay(): Razorpay | null {
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export { keySecret as RAZORPAY_KEY_SECRET };
