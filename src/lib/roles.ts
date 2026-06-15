// Role identifiers kept as string literals (not the Prisma enum) so this module
// stays edge-safe and can be imported from middleware without pulling in Prisma.
export type Role = "MASTER_ADMIN" | "LANDLORD" | "TENANT";

export const roleHome: Record<Role, string> = {
  MASTER_ADMIN: "/master-admin",
  LANDLORD: "/landlord",
  TENANT: "/tenant",
};

export const protectedPrefixes = ["/master-admin", "/landlord", "/tenant"] as const;
