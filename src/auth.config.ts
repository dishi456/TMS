import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/roles";

// Edge-safe config: no Prisma, no bcrypt. Shared by middleware and the full
// auth instance. The Credentials provider (Node-only) is added in src/auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [], // populated in src/auth.ts
} satisfies NextAuthConfig;
