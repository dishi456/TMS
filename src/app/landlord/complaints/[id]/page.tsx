import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, btn, inputClass } from "@/components/ui";
import { respondComplaint, setComplaintStatus } from "../actions";

export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default async function ComplaintDetail({
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
    where: { id, property: { landlordId: session!.user.id } },
    include: {
      tenant: { select: { fullName: true, email: true } },
      property: { select: { name: true } },
      messages: { include: { author: { select: { fullName: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!complaint) notFound();

  const open = complaint.status !== "CLOSED";

  return (
    <div className="space-y-5">
      <div className="text-sm"><Link href="/landlord/complaints" className="text-blue-600 hover:text-blue-700">← Back to complaints</Link></div>
      {sp.error === "empty" && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">Write a reply first.</div>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{complaint.subject}</h1>
          <p className="text-sm text-slate-500">{complaint.property?.name} · {complaint.tenant.fullName}</p>
          <div className="mt-1"><Badge tone={complaint.status === "RESOLVED" ? "green" : complaint.status === "CLOSED" ? "slate" : "amber"}>{cap(complaint.status)}</Badge></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {complaint.status !== "RESOLVED" && complaint.status !== "CLOSED" && (
            <form action={setComplaintStatus}><input type="hidden" name="id" value={complaint.id} /><input type="hidden" name="status" value="RESOLVED" /><button className={btn("secondary")}>Resolve</button></form>
          )}
          {complaint.status !== "CLOSED" && (
            <form action={setComplaintStatus}><input type="hidden" name="id" value={complaint.id} /><input type="hidden" name="status" value="CLOSED" /><button className={btn("primary")}>Close ticket</button></form>
          )}
          {complaint.status === "CLOSED" && (
            <form action={setComplaintStatus}><input type="hidden" name="id" value={complaint.id} /><input type="hidden" name="status" value="REOPENED" /><button className={btn("secondary")}>Reopen</button></form>
          )}
        </div>
      </div>

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Original complaint</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{complaint.description}</p>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Conversation</h3>
        <div className="space-y-2">
          {complaint.messages.length === 0 && <p className="text-sm text-slate-400">No replies yet.</p>}
          {complaint.messages.map((m) => (
            <div key={m.id} className={`rounded-xl border p-3 text-sm ${m.author.role === "LANDLORD" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-slate-700">{m.author.fullName} <span className="text-xs font-normal text-slate-400">({cap(m.author.role)})</span></span>
                <span className="text-xs text-slate-400">{m.createdAt.toLocaleDateString("en-US")}</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-700">{m.body}</p>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <Card>
          <form action={respondComplaint} className="space-y-2">
            <input type="hidden" name="id" value={complaint.id} />
            <label className="text-sm font-medium text-slate-700">Reply</label>
            <textarea name="body" rows={3} required className={inputClass + " w-full"} placeholder="Write a response to the tenant…" />
            <button className={btn("primary")}>Send response</button>
          </form>
        </Card>
      )}
    </div>
  );
}
