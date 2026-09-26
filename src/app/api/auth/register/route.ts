import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { execute, queryOne } from "@/lib/db";
import { fail, handleError, parseBody } from "@/lib/api";
import { attachSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (process.env.ALLOW_REGISTER !== "true") return fail(403, "Pendaftaran akun baru dinonaktifkan.");
    const body = await parseBody(req, registerSchema);
    const exists = await queryOne("SELECT id FROM users WHERE email = ?", [body.email]);
    if (exists) return fail(409, "Email sudah terdaftar.");
    const hash = await bcrypt.hash(body.password, 12);
    const r = await execute("INSERT INTO users (full_name, email, password_hash) VALUES (?,?,?)", [body.fullName, body.email, hash]);
    await execute("INSERT INTO user_settings (user_id) VALUES (?)", [r.insertId]);
    return attachSession(NextResponse.json({ ok: true }, { status: 201 }), { uid: r.insertId, name: body.fullName });
  } catch (e) {
    return handleError(e);
  }
}
