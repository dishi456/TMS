import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { roleHome, protectedPrefixes, type Role } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const session = req.auth;
  const isAuthed = !!session?.user;
  const role = session?.user?.role as Role | undefined;

  const matchedPrefix = protectedPrefixes.find(
    (p) => path === p || path.startsWith(p + "/"),
  );

  // Not signed in and hitting a protected area → send to login with return path.
  if (matchedPrefix && !isAuthed) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  if (isAuthed && role) {
    // Signed-in user on a protected area that isn't theirs → bounce to their home.
    if (matchedPrefix && matchedPrefix !== roleHome[role]) {
      return NextResponse.redirect(new URL(roleHome[role], nextUrl));
    }
    // Signed-in user visiting login/register/root → straight to their dashboard.
    if (path === "/login" || path === "/register" || path === "/") {
      return NextResponse.redirect(new URL(roleHome[role], nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets and PWA files.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|swe-worker-.*|logo.png|icon.svg|icon-maskable.svg|icon-192.png|icon-512.png|icon-maskable.png|apple-icon.png|robots.txt).*)",
  ],
};
