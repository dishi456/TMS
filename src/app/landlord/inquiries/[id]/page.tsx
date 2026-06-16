import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { InquiryChat } from "@/components/InquiryChat";

export const metadata: Metadata = { title: "Enquiry" };
export const dynamic = "force-dynamic";

export default async function LandlordInquiryThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const meId = session!.user.id;

  const inquiry = await prisma.propertyInquiry.findFirst({
    where: { id, landlordId: meId },
    include: { property: { select: { name: true } } },
  });
  if (!inquiry) notFound();

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <Link href="/landlord/inquiries" className="text-blue-600 hover:text-blue-700">← All enquiries</Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <p className="font-semibold text-slate-800">{inquiry.guestName}</p>
          <p className="text-slate-500">📞 {inquiry.guestPhone}</p>
          {inquiry.guestEmail && <p className="text-slate-500">✉ {inquiry.guestEmail}</p>}
          <p className="text-slate-500">🏠 {inquiry.property.name}</p>
        </div>
      </Card>

      <InquiryChat inquiryId={inquiry.id} guestName={inquiry.guestName.split(" ")[0]} />
    </div>
  );
}
