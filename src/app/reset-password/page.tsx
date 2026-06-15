import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-3 h-12" />
          <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {token ? (
            <ResetForm token={token} />
          ) : (
            <p className="text-sm text-red-600">This reset link is missing its token. Please request a new one.</p>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">← Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
