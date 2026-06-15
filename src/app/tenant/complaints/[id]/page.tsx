import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn, inputClass } from "@/components/ui";
import { replyComplaint, reopenComplaint } from "../actions";

export const dynamic = "force-dynamic";
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default async function TenantComplaintDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();

  const complaint = await prisma.complaint.findFirst({
    where: { id, tenantId: session!.user.id },
    include: {
      property: { select: { name: true } },
      messages: { include: { author: { select: { fullName: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!complaint) notFound();

  const ended = complaint.status === "RESOLVED" || complaint.status === "CLOSED";

  return (
    <div className="space-y-5">
      <div className="text-sm"><Link href="/tenant/complaints" className="text-blue-600 hover:text-blue-700">← Back to complaints</Link></div>
      {sp.error === "empty" && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">Write a message first.</div>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{complaint.subject}</h1>
          <p className="text-sm text-slate-500">{complaint.property?.name ?? "General"}</p>
          <div className="mt-1"><Badge tone={complaint.status === "RESOLVED" ? "green" : complaint.status === "CLOSED" ? "slate" : "amber"}>{cap(complaint.status)}</Badge></div>
        </div>
        {ended && (
          <form action={reopenComplaint}><input type="hidden" name="id" value={complaint.id} /><button className={btn("secondary")}>Reopen complaint</button></form>
        )}
      </div>

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Your complaint</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{complaint.description}</p>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Conversation</h2>
        <div className="space-y-2">
          {complaint.messages.length === 0 && <p className="text-sm text-slate-400">No responses yet. Your landlord will reply here.</p>}
          {complaint.messages.map((m) => (
            <div key={m.id} className={`rounded-xl border p-3 text-sm ${m.author.role === "TENANT" ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-slate-700">{m.author.fullName} <span className="text-xs font-normal text-slate-400">({cap(m.author.role)})</span></span>
                <span className="text-xs text-slate-400">{m.createdAt.toLocaleDateString("en-US")}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-700">{m.body}</p>
            </div>
          ))}
        </div>
      </div>

      {complaint.status !== "CLOSED" && (
        <Card>
          <form action={replyComplaint} className="space-y-2">
            <input type="hidden" name="id" value={complaint.id} />
            <label className="text-sm font-medium text-slate-700">Add a message</label>
            <textarea name="body" rows={3} required className={inputClass + " w-full"} placeholder="Write a message…" />
            <button className={btn("primary")}>Send</button>
          </form>
        </Card>
      )}
    </div>
  );
}
