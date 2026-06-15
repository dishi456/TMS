import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { AccountProfileForm, AccountPasswordForm } from "@/components/AccountForms";

export const dynamic = "force-dynamic";

export default async function MasterAdminAccountPage() {
  const session = await auth();
  const userId = session!.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">My Account</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-800">Profile</h2>
          <div className="mt-4">
            <AccountProfileForm
              defaults={{ fullName: user.fullName, email: user.email, phone: user.phone ?? undefined }}
            />
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-800">Change password</h2>
          <div className="mt-4">
            <AccountPasswordForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
