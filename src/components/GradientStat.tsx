import Link from "next/link";
import type { ReactNode } from "react";

// A vivid, "dynamic" KPI tile: gradient fill, decorative bubbles, an icon, and
// a subtle lift on hover when it links somewhere.
export function GradientStat({
  label,
  value,
  hint,
  icon,
  gradient,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  gradient: string; // tailwind `from-… to-…` pair
  href?: string;
}) {
  const inner = (
    <div className={`relative h-full overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-sm ring-1 ring-white/10 transition-all duration-200 ${href ? "group-hover:-translate-y-0.5 group-hover:shadow-lg" : ""}`}>
      <div className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/15" />
      <div className="pointer-events-none absolute -bottom-6 -left-3 h-16 w-16 rounded-full bg-white/10" />
      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/85">{label}</p>
        <span className="text-base leading-none opacity-95">{icon}</span>
      </div>
      <p className="relative mt-2 text-2xl font-bold leading-tight">{value}</p>
      {hint && <p className="relative mt-0.5 text-[11px] text-white/75">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="group block h-full">{inner}</Link>
  ) : (
    inner
  );
}
