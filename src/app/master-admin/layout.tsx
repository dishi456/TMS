import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/AdminShell";

export const metadata: Metadata = {
  title: { template: "%s · Master Admin", default: "Master Admin Dashboard" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const unread = await prisma.notification.count({
    where: { userId: session!.user.id, read: false },
  });
  return (
    <AdminShell userName={session?.user?.name ?? "Admin"} unread={unread}>
      {children}
    </AdminShell>
  );
}
