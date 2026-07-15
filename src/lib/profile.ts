// Shared profile / preferences helpers, kept in lock-step with the mobile
// /tenant/profile + /landlord/profile endpoints.

export const CURRENCIES = ["INR", "USD", "CAD", "GBP", "EUR", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  INR: "₹ Indian Rupee (INR)",
  USD: "$ US Dollar (USD)",
  CAD: "$ Canadian Dollar (CAD)",
  GBP: "£ British Pound (GBP)",
  EUR: "€ Euro (EUR)",
  AUD: "$ Australian Dollar (AUD)",
};

// 3–20 letters, numbers or underscores. Matches the mobile validation.
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type CompletionInput = {
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  username?: string | null;
  governmentId?: string | null;
  emergencyContact?: string | null;
  verified?: boolean | null;
};

function pct(checks: boolean[]): number {
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function tenantCompletion(u: CompletionInput): number {
  return pct([!!u.fullName, !!u.phone, !!u.avatarUrl, !!u.username, !!u.governmentId, !!u.emergencyContact, !!u.verified]);
}

export function landlordCompletion(u: CompletionInput): number {
  return pct([!!u.fullName, !!u.phone, !!u.avatarUrl, !!u.username, !!u.verified]);
}
