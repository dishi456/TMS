import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; registered?: string; reset?: string }>;
}) {
  const { callbackUrl, registered, reset } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-3 h-14" />
          <p className="text-sm text-slate-500">Sign in to your portal</p>
        </div>

        {registered && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
            Account created! You can sign in now — access unlocks once your account is approved.
          </div>
        )}
        {reset && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
            Your password has been reset. Sign in with your new password.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm callbackUrl={callbackUrl ?? "/"} />
          <p className="mt-3 text-right text-xs">
            <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">Forgot password?</Link>
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Create an account
          </Link>
        </p>

        <p className="mt-3 flex justify-center gap-4 text-center text-sm">
          <Link href="/listings" className="font-medium text-blue-600 hover:text-blue-700">Browse properties</Link>
          <Link href="/reviews" className="font-medium text-blue-600 hover:text-blue-700">Community reviews</Link>
        </p>

        <div className="mt-6 flex justify-center">
          <InstallPrompt />
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-blue-50/60 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Demo logins (after seeding):</p>
          <p>admin@tms.local · landlord@tms.local · tenant@tms.local</p>
          <p>Password: Password123!</p>
        </div>
      </div>
    </main>
  );
}
