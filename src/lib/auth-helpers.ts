import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Authorize a Master Admin. Use at the top of every admin server action —
 * the proxy guards page navigation, but server actions are directly callable,
 * so they must re-check the role server-side (defense in depth).
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (!session?.user || session.user.role !== "MASTER_ADMIN") {
    throw new Error("Unauthorized: Master Admin access required.");
  }
  return session;
}

export async function requireLandlord(): Promise<Session> {
  const session = await auth();
  if (!session?.user || session.user.role !== "LANDLORD") {
    throw new Error("Unauthorized: Landlord access required.");
  }
  return session;
}

export async function requireTenant(): Promise<Session> {
  const session = await auth();
  if (!session?.user || session.user.role !== "TENANT") {
    throw new Error("Unauthorized: Tenant access required.");
  }
  return session;
}
