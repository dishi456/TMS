// Token (Bearer JWT) auth for the mobile API (/api/mobile/v1/*).
// Native apps can't use the web's cookie session, so they send
// `Authorization: Bearer <token>`. Tokens are signed with AUTH_SECRET (same
// secret the web session uses) via jose, 30-day expiry.
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-secret-change-me-please-0123456789",
);

export async function signMobileToken(user: { id: string; role: Role }): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export type MobileUser = {
  id: string;
  role: Role;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
};

/** Verify the Bearer token and load the user. Returns null if missing/invalid/suspended. */
export async function getMobileUser(req: Request): Promise<MobileUser | null> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], secret);
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, fullName: true, phone: true, status: true },
    });
    if (!user || user.status === "SUSPENDED") return null;
    return user as MobileUser;
  } catch {
    return null;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Guard helper: returns { user } on success, or { res } holding the error response.
 *  `role` may be a single role or a list of allowed roles. */
export async function requireMobile(
  req: Request,
  role?: Role | Role[],
): Promise<{ user: MobileUser; res: null } | { user: null; res: Response }> {
  const user = await getMobileUser(req);
  if (!user) return { user: null, res: json({ error: "Unauthorized" }, 401) };
  if (role) {
    const ok = Array.isArray(role) ? role.includes(user.role) : user.role === role;
    if (!ok) return { user: null, res: json({ error: "Forbidden" }, 403) };
  }
  return { user, res: null };
}
