import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const PROTECTED_PREFIXES = ["/portal", "/api/results", "/api/departments", "/api/sessions"];
const PUBLIC_PATHS = ["/login", "/results", "/api/students"];

// Next.js 16 calls this boundary Proxy. It provides an optimistic session check;
// state-changing routes also verify the session in their route handler.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublic) return NextResponse.next();

  const isProtected = pathname === "/" || PROTECTED_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (!isProtected) return NextResponse.next();

  const session = await decrypt(request.cookies.get("portal-session")?.value);
  if (session && new Date(session.expiresAt) >= new Date()) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|public).*)"],
};
