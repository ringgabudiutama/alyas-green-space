import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import { fail, handleError, parseBody } from "@/lib/api";
import { attachSession, clearLoginFailures, loginRateLimited, registerLoginFailure } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Hash dummy supaya waktu respons email-tidak-terdaftar ≈ password salah (mencegah enumerasi email)
let dummyHash: string | null = null;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await bcrypt.hash("dummy-password-for-timing", 12);
  return dummyHash;
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, loginSchema);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const key = `${ip}:${body.email}`;
    if (loginRateLimited(key)) return fail(429, "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.");

    const user = await queryOne<{ id: number; full_name: string; password_hash: string }>(
      "SELECT id, full_name, password_hash FROM users WHERE email = ?",
      [body.email]
    );
    const valid = await bcrypt.compare(body.password, user?.password_hash || (await getDummyHash()));
    if (!user || !valid) {
      registerLoginFailure(key);
      return fail(401, "Email atau password salah.");
    }
    clearLoginFailures(key);
    const res = NextResponse.json({ ok: true, name: user.full_name });
    return attachSession(res, { uid: user.id, name: user.full_name });
  } catch (e) {
    return handleError(e);
  }
}
