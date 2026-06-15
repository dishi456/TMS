import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationList } from "@/components/NotificationList";

export const dynamic = "force-dynamic";

export default async function MasterAdminNotificationsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <NotificationList notifications={notifications} back="/master-admin/notifications" />;
}
