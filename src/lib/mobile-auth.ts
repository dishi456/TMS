// Bearer-JWT authentication for the native mobile apps (Tenant & User).
//
// The web app authenticates with an httpOnly NextAuth session cookie, which is
// awkward for native clients. Here we issue a self-contained HS256 JWT signed
// with the same AUTH_SECRET, sent as `Authorization: Bearer <token>`.
//
// Tokens are stateless: { sub: userId, role, iat, exp }. Logout = the app drops
// the token. No new tables, no schema changes.

import { createHmac, timingSafeEqual } from "crypto";
import type { Role } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
const TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 days

type JwtPayload = { sub: string; role: Role; iat: number; exp: number };

// --- base64url helpers ------------------------------------------------------
const b64url = (input: Buffer | string): string =>
  (Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64urlToBuf = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function hmac(data: string): Buffer {
  return createHmac("sha256", SECRET).update(data).digest();
}

// --- sign / verify ----------------------------------------------------------
export function signMobileToken(userId: string, role: Role): string {
  if (!SECRET) throw new Error("AUTH_SECRET is not configured.");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ sub: userId, role, iat: now, exp: now + TOKEN_TTL_SEC } satisfies JwtPayload),
  );
  const sig = b64url(hmac(`${header}.${payload}`));
  return `${header}.${payload}.${sig}`;
}

export function verifyMobileToken(token: string): JwtPayload | null {
  if (!SECRET || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;

  const expected = hmac(`${header}.${payload}`);
  const got = b64urlToBuf(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;

  try {
    const data = JSON.parse(b64urlToBuf(payload).toString("utf8")) as JwtPayload;
    if (!data.sub || !data.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return data;
  } catch {
    return null;
  }
}

// --- request helpers --------------------------------------------------------

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

export type MobileUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  phone: string | null;
  avatarUrl: string | null;
  verified: boolean;
};

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  phone: true,
  avatarUrl: true,
  verified: true,
} as const;

// Resolve the caller from a Bearer token. Returns null if missing/invalid/
// suspended. Does NOT fall back to cookies — use sessionOrBearerUser for that.
export async function bearerUser(req: Request): Promise<MobileUser | null> {
  const token = bearer(req);
  if (!token) return null;
  const payload = verifyMobileToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: USER_SELECT });
  if (!user || user.status === "SUSPENDED") return null;
  return user;
}

// For endpoints shared with the web (messages, upload, payments): accept either
// a mobile Bearer token or the existing NextAuth session cookie.
export async function sessionOrBearerUser(
  req: Request,
): Promise<{ id: string; role: Role } | null> {
  const viaBearer = await bearerUser(req);
  if (viaBearer) return { id: viaBearer.id, role: viaBearer.role };
  const session = await auth();
  if (session?.user?.id) return { id: session.user.id, role: session.user.role as Role };
  return null;
}

// --- JSON response helpers --------------------------------------------------
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// Gate: require a valid Bearer user, optionally restricted to certain roles.
// Returns the user, or a ready-to-return 401/403 Response.
export async function requireMobileUser(
  req: Request,
  roles?: Role[],
): Promise<MobileUser | Response> {
  const user = await bearerUser(req);
  if (!user) return error("Unauthorized", 401);
  if (roles && roles.length && !roles.includes(user.role)) return error("Forbidden", 403);
  return user;
}
