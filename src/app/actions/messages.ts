"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// Send a direct message between a landlord and one of their tenants.
export async function sendMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const senderId = session.user.id;
  const recipientId = String(formData.get("recipientId"));
  const body = String(formData.get("body") || "").trim();
  const back = String(formData.get("back") || "/");
  if (!recipientId || !body) redirect(back);

  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId }, select: { id: true, role: true, landlordId: true, fullName: true } }),
    prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, role: true, landlordId: true } }),
  ]);
  if (!me || !other) redirect(back);

  // Only a tenant<->their landlord pair may message each other.
  const ok =
    (me.role === "TENANT" && other.role === "LANDLORD" && me.landlordId === other.id) ||
    (me.role === "LANDLORD" && other.role === "TENANT" && other.landlordId === me.id);
  if (!ok) redirect(back);

  await prisma.message.create({ data: { senderId, recipientId, body: body.slice(0, 2000) } });
  await notify(recipientId, {
    type: "message",
    title: `New message from ${me.fullName}`,
    body: body.length > 80 ? body.slice(0, 80) + "…" : body,
    link: other.role === "TENANT" ? "/tenant/messages" : `/landlord/messages/${senderId}`,
  });

  revalidatePath(back);
  redirect(back);
}

// Tenant confirms their contact details (name / phone) before starting the chat.
export async function confirmChatContact(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { ...(fullName ? { fullName } : {}), phone: phone || null, chatContactConfirmed: true },
  });
  revalidatePath("/tenant/messages");
  redirect("/tenant/messages");
}
