import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ProfileForm, PasswordForm } from "./ProfileForms";
import { deleteProfileDoc } from "./actions";
import { ImageUploader } from "@/components/ImageUploader";
import { AvatarUploader } from "@/components/AvatarUploader";
import { tenantCompletion } from "@/lib/profile";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function TenantProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [user, docs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.document.findMany({ where: { ownerId: userId, propertyId: null, leaseId: null }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!user) return null;

  const completion = tenantCompletion(user);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">My Profile</h1>
      {sp.uploaded && <Banner tone="green">Document uploaded.</Banner>}
      {sp.error === "nofile" && <Banner tone="amber">Please choose a file.</Banner>}
      {sp.error === "toobig" && <Banner tone="amber">File too large (max 8 MB).</Banner>}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AvatarUploader avatarUrl={user.avatarUrl} name={user.fullName} />
          <div className="sm:w-56">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Profile completion</span>
              <span className="font-semibold text-slate-800">{completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${completion}%` }} />
            </div>
            {completion < 100 && <p className="mt-1.5 text-[11px] text-slate-400">Add a photo, username, phone, ID &amp; emergency contact to reach 100%.</p>}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Personal information</h2>
          <Card>
            <ProfileForm
              defaults={{
                fullName: user.fullName,
                email: user.email,
                username: user.username ?? undefined,
                phone: user.phone ?? undefined,
                governmentId: user.governmentId ?? undefined,
                emergencyContact: user.emergencyContact ?? undefined,
                currency: user.currency ?? undefined,
                prefCountry: user.prefCountry ?? undefined,
                prefState: user.prefState ?? undefined,
                prefCity: user.prefCity ?? undefined,
              }}
            />
          </Card>
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Change password</h2>
            <Card><PasswordForm /></Card>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">My documents</h2>
            <Card>
              {docs.length === 0 ? (
                <p className="text-sm text-slate-400">No documents uploaded.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:text-blue-700">{d.label ?? "Document"}</a>
                      <form action={deleteProfileDoc}><input type="hidden" name="docId" value={d.id} /><button className="text-xs text-red-500 hover:text-red-600">remove</button></form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-col gap-4 border-t border-slate-100 pt-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-600">Government ID</span>
                  <ImageUploader purpose="profile-id" accept="image/*,application/pdf" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-600">Other document</span>
                  <ImageUploader purpose="profile-other" accept="image/*,application/pdf" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const cls = tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
