import type { Metadata } from "next";
import { auth } from "@/auth";
import { listConversations } from "@/lib/chat";
import { ConversationList } from "@/components/ConversationList";

export const metadata: Metadata = { title: "Property Chat" };
export const dynamic = "force-dynamic";

export default async function LandlordChatPage() {
  const session = await auth();
  const conversations = await listConversations(session!.user.id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Property Chat</h1>
        <p className="text-sm text-slate-500">A private conversation with each tenant, one per lease.</p>
      </div>
      <ConversationList conversations={conversations} basePath="/landlord/chat" />
    </div>
  );
}
