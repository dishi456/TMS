import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, btn } from "@/components/ui";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const tone = (s: string): "green" | "amber" | "red" | "slate" | "sky" =>
  s === "RESOLVED" ? "green" : s === "CLOSED" ? "slate" : s === "REOPENED" ? "red" : s === "RESPONDED" ? "sky" : "amber";

export default async function LandlordComplaintsPage() {
  const session = await auth();
  const complaints = await prisma.complaint.findMany({
    where: { property: { landlordId: session!.user.id } },
    include: { tenant: { select: { fullName: true } }, property: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold text-slate-800">
        Complaints <span className="text-slate-400">({formatNumber(complaints.length)})</span>
      </h1>

      {complaints.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">No complaints.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/landlord/complaints/${c.id}`} className="font-medium text-slate-800 hover:text-blue-700">{c.subject}</Link>
                    <div className="text-xs text-slate-400">{c.createdAt.toLocaleDateString("en-US")}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.property?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.tenant.fullName}</td>
                  <td className="px-4 py-3"><Badge tone={tone(c.status)}>{cap(c.status)}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/landlord/complaints/${c.id}`} className={btn("secondary", "px-2.5 py-1.5")}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
