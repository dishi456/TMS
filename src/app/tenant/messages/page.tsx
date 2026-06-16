import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, FieldLabel, inputClass, btn } from "@/components/ui";
import { LiveChat } from "@/components/LiveChat";
import { confirmChatContact } from "@/app/actions/messages";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function TenantMessagesPage() {
  const session = await auth();
  const meId = session!.user.id;

  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: {
      fullName: true,
      email: true,
      phone: true,
      chatContactConfirmed: true,
      landlord: { select: { id: true, fullName: true } },
    },
  });

  if (!me?.landlord) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-800">Messages</h1>
        <Card><p className="text-sm text-slate-400">You don&apos;t have an assigned landlord yet, so there&apos;s no one to chat with.</p></Card>
      </div>
    );
  }

  // Pre-chat gate: confirm contact details once before opening the chat.
  if (!me.chatContactConfirmed) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Start a chat with {me.landlord.fullName}</h1>
          <p className="text-sm text-slate-500">Confirm your contact details so your landlord knows who they&apos;re talking to.</p>
        </div>
        <Card>
          <form action={confirmChatContact} className="space-y-4">
            <label className="flex flex-col gap-1">
              <FieldLabel>Full name</FieldLabel>
              <input name="fullName" defaultValue={me.fullName} required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel>Email</FieldLabel>
              <input value={me.email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
              <span className="text-xs text-slate-400">Your account email — used for notifications.</span>
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel>Phone number</FieldLabel>
              <input name="phone" defaultValue={me.phone ?? ""} required placeholder="+1 555 000 0000" className={inputClass} />
            </label>
            <button className={btn("primary")}>Start chatting →</button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Messages</h1>
        <p className="text-sm text-slate-500">Chat directly with your landlord.</p>
      </div>
      <LiveChat meId={meId} otherId={me.landlord.id} otherName={me.landlord.fullName.split(" ")[0]} />
    </div>
  );
}
