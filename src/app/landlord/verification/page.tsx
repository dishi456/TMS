import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VerificationDocs } from "@/components/VerificationDocs";

export const metadata: Metadata = { title: "Verification" };
export const dynamic = "force-dynamic";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [user, docCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { verified: true } }),
    prisma.document.count({ where: { ownerId: userId, propertyId: null, leaseId: null, type: "GOVERNMENT_ID" } }),
  ]);
  const verified = user?.verified ?? false;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Account Verification</h1>
        <p className="text-sm text-slate-500">
          Upload your Aadhaar card and a photo of your property. The admin will review and approve.
        </p>
      </div>

      {verified ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Your account is verified.
        </div>
      ) : docCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⏳ Documents submitted — pending admin review.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Action needed: upload your Aadhaar card to start verification.
        </div>
      )}

      {sp.uploaded && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">File uploaded.</p>}
      {sp.error === "nofile" && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Please choose a file.</p>}
      {sp.error === "toobig" && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">File too large (max 8 MB).</p>}

      <VerificationDocs userId={userId} />
    </div>
  );
}
