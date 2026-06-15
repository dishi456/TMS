import { Badge } from "@/components/ui";

const TONE: Record<string, "green" | "red" | "sky" | "amber" | "slate"> = {
  DRAFT: "amber",
  ACTIVE: "green",
  RENEWED: "sky",
  TERMINATED: "red",
  EXPIRED: "slate",
  COMPLETED: "slate",
};

export function LeaseStatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE[status] ?? "slate"}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
