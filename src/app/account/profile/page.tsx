import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { AccountProfileForm, AccountPasswordForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Account</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your details and password.</p>
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

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Looking to rent?</p>
        <p className="mt-0.5 text-slate-500">When you finalise a place, your landlord can upgrade this account to a full tenant account — with rent payments, maintenance requests and your lease, all here.</p>
      </div>
    </div>
  );
}
