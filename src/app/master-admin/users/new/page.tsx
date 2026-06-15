import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { UserForm } from "../UserForm";

export const metadata: Metadata = { title: "New User" };

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = role === "TENANT" ? "TENANT" : "LANDLORD";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-sm">
        <Link href={`/master-admin/users?role=${initialRole}`} className="text-blue-600 hover:text-blue-700">
          ← Back to users
        </Link>
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Create a new user</h2>
      <Card>
        <UserForm mode="create" defaults={{ role: initialRole }} />
      </Card>
    </div>
  );
}
