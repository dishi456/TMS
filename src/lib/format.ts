import type { Prisma } from "@prisma/client";

type Numeric = number | string | Prisma.Decimal | null | undefined;

function toNumber(value: Numeric): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

// US-dollar currency, no cents for dashboard figures.
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(value: Numeric): string {
  return usd.format(toNumber(value));
}

// Compact form for big dashboard numbers: $1.2K, $3.4M, $1.1B.
export function formatMoneyCompact(value: Numeric): string {
  const n = toNumber(value);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return usd.format(n);
}

const num = new Intl.NumberFormat("en-US");
export function formatNumber(value: Numeric): string {
  return num.format(toNumber(value));
}
