import { Badge } from "@/components/ui";

const STATUS_TONE: Record<string, "green" | "red" | "sky" | "amber" | "slate"> = {
  PENDING: "amber",
  ASSIGNED: "sky",
  IN_PROGRESS: "sky",
  RESOLVED: "green",
  CLOSED: "slate",
  REJECTED: "red",
};

const PRIORITY_TONE: Record<string, "green" | "red" | "sky" | "amber" | "slate"> = {
  LOW: "slate",
  MEDIUM: "amber",
  HIGH: "red",
};

function label(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

export function MaintenanceStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "slate"}>{label(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={PRIORITY_TONE[priority] ?? "slate"}>{label(priority)}</Badge>;
}
