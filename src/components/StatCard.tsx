export function StatCard({
  label,
  value,
  hint,
  tone = "dark",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "dark" | "light";
}) {
  const styles =
    tone === "light"
      ? {
          card: "border-slate-200 bg-white shadow-sm",
          label: "text-slate-500",
          value: "text-slate-900",
          hint: "text-slate-400",
        }
      : {
          card: "border-slate-800 bg-slate-900/60",
          label: "text-slate-400",
          value: "text-white",
          hint: "text-slate-500",
        };

  return (
    <div className={`rounded-xl border p-4 ${styles.card}`}>
      <p className={`text-xs ${styles.label}`}>{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${styles.value}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${styles.hint}`}>{hint}</p>}
    </div>
  );
}
