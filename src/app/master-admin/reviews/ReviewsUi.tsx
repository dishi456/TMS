import { Badge } from "@/components/ui";

const STATUS_TONE: Record<string, "green" | "red" | "amber" | "slate"> = {
  VISIBLE: "green",
  FLAGGED: "amber",
  REMOVED: "red",
};

export function RatingStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "slate"}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap text-amber-500" title={`${value} / 5`}>
      {"★".repeat(value)}
      <span className="text-slate-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export function directionLabel(direction: string): string {
  return direction === "LANDLORD_TO_TENANT" ? "Landlord → Tenant" : "Tenant → Landlord";
}
