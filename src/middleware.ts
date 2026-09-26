import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

const PUBLIC_PAGES = ["/login"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/register", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Proteksi CSRF dasar: request yang mengubah data harus berasal dari origin yang sama
  if (isApi && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return NextResponse.json({ error: "Origin tidak diizinkan." }, { status: 403 });
    }
  }

  if (PUBLIC_PAGES.includes(pathname) || PUBLIC_API.includes(pathname)) {
    // Sudah login lalu buka /login → langsung ke welcome
    if (pathname === "/login") {
      const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
      if (s) return NextResponse.redirect(new URL("/welcome", req.url));
    }
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    if (isApi) return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Semua route kecuali file statis
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|offline.html|manifest.webmanifest|music/|images/|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|gif|mp3|ogg|wav|m4a)$).*)",
  ],
};
