import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { LiveChat } from "@/components/LiveChat";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function LandlordThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const meId = session!.user.id;

  const tenant = await prisma.user.findFirst({
    where: { id, role: "TENANT", landlordId: meId },
    select: { id: true, fullName: true, email: true, phone: true },
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <Link href="/landlord/messages" className="text-blue-600 hover:text-blue-700">← All conversations</Link>
      </div>

      {/* Tenant contact card */}
      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <p className="font-semibold text-slate-800">{tenant.fullName}</p>
          <p className="text-slate-500">✉ {tenant.email}</p>
          <p className="text-slate-500">📞 {tenant.phone ?? "—"}</p>
        </div>
      </Card>

      <LiveChat meId={meId} otherId={tenant.id} otherName={tenant.fullName.split(" ")[0]} />
    </div>
  );
}
