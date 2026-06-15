import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { AccountProfileForm, AccountPasswordForm } from "@/components/AccountForms";
import { VerificationDocs } from "@/components/VerificationDocs";

export const metadata: Metadata = { title: "My Account" };
export const dynamic = "force-dynamic";

export default async function LandlordAccountPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [user, docCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.document.count({ where: { ownerId: userId, propertyId: null, leaseId: null, type: "GOVERNMENT_ID" } }),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">My Account</h1>
        {user.verified ? <Badge tone="sky">Verified</Badge> : docCount > 0 ? <Badge tone="amber">Pending review</Badge> : <Badge tone="slate">Unverified</Badge>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Profile</h2>
          <div className="mt-3">
            <AccountProfileForm defaults={{ fullName: user.fullName, email: user.email, phone: user.phone ?? undefined }} />
          </div>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-700">Change password</h2>
          <div className="mt-3">
            <AccountPasswordForm />
          </div>
        </Card>
      </div>

      {/* Documents (SRS Profile Management: Upload Documents) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Verification documents</h2>
          {!user.verified && <p className="text-xs text-slate-400">Upload your Aadhaar &amp; a property photo for the admin to verify.</p>}
        </div>
        <VerificationDocs userId={userId} />
      </div>
    </div>
  );
}
