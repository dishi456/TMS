import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui";
import { actionLabel, timeAgo } from "@/lib/activity";

export const metadata: Metadata = { title: "Activity Log" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">Activity Log</h2>
        <p className="text-sm text-slate-500">
          Audit trail of administrative actions (latest 100).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">By</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No activity recorded yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-700">{actionLabel(log.action)}</td>
                <td className="px-4 py-3">
                  <Badge tone="slate">{log.entity}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{log.actor?.fullName ?? "System"}</td>
                <td className="px-4 py-3 text-slate-500" title={log.createdAt.toLocaleString("en-US")}>
                  {timeAgo(log.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
