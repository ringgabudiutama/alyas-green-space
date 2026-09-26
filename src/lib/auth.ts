import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from "./jwt";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function attachSession(res: NextResponse, payload: SessionPayload): Promise<NextResponse> {
  const token = await signSession(payload);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export function clearSession(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

// ---- Rate limit login sederhana (per instance server) ----
const attempts = new Map<string, { count: number; until: number }>();
export function loginRateLimited(key: string): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (a && a.until > now && a.count >= 5) return true;
  return false;
}
export function registerLoginFailure(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 });
  else a.count += 1;
}
export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
