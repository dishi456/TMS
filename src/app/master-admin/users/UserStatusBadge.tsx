import { Badge } from "@/components/ui";

export function UserStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge tone="green">Active</Badge>;
  if (status === "PENDING") return <Badge tone="amber">Pending</Badge>;
  return <Badge tone="red">Suspended</Badge>;
}
