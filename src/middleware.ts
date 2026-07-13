// Simple password gate: every route (pages, API, public files) requires the
// auth cookie, which /api/login sets after checking APP_PASSWORD.
// Without APP_PASSWORD configured (e.g. plain local dev) the gate is open.

import { NextResponse, type NextRequest } from "next/server";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AUTH_COOKIE = "hub_auth";

export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const expected = await sha256Hex(`tuv-hub:${password}`);
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === expected) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = pathname !== "/" ? `?from=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(login);
}

export const config = {
  // everything except the login page/endpoint and Next.js internals
  matcher: ["/((?!login|api/login|_next/static|_next/image|icon.svg).*)"],
};
