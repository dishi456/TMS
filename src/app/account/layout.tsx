import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleHome, type Role } from "@/lib/roles";
import { UserShell } from "@/components/UserShell";

export const metadata: Metadata = {
  title: { template: "%s · Lease Lord", default: "My Account" },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  // If this account was converted to another role, send them to the right home.
  const role = session.user.role as Role;
  if (role !== "USER") redirect(roleHome[role] ?? "/login");

  // Badge: unread landlord replies across this user's enquiries.
  const enquiryCount = await prisma.inquiryMessage.count({
    where: { fromGuest: false, readByGuest: false, inquiry: { userId: session.user.id } },
  });

  return (
    <UserShell userName={session.user.name ?? "Member"} enquiryCount={enquiryCount}>
      {children}
    </UserShell>
  );
}
