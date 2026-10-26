import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "./lib/content-security";

export function middleware(request: NextRequest) {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const nonce = btoa(String.fromCharCode(...bytes));
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");
  const headers = new Headers(request.headers);
  // Overwrite user-supplied headers. Next reads this policy to nonce its own scripts.
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  // A fresh document and its matching nonce must always travel together.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
