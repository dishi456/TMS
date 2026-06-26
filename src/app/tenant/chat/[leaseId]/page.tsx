import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getConversationHeader } from "@/lib/chat";
import { LeaseChat } from "@/components/LeaseChat";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function TenantChatThreadPage({ params }: { params: Promise<{ leaseId: string }> }) {
  const { leaseId } = await params;
  const session = await auth();
  const header = await getConversationHeader(leaseId, session!.user.id);
  if (!header) notFound();
  return (
    <div className="space-y-3">
      <Link href="/tenant/chat" className="text-sm text-slate-500 hover:text-slate-700">← All conversations</Link>
      <LeaseChat leaseId={leaseId} header={header} />
    </div>
  );
}
