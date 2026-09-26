import bcrypt from "bcryptjs";
import { execute, queryOne } from "@/lib/db";
import { fail, ok, parseBody, withAuth } from "@/lib/api";
import { passwordSchema } from "@/lib/validators";

export const runtime = "nodejs";

export const PUT = withAuth(async (req, user) => {
  const b = await parseBody(req, passwordSchema);
  const u = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.uid]);
  if (!u || !(await bcrypt.compare(b.currentPassword, u.password_hash))) return fail(400, "Password saat ini salah.");
  if (b.currentPassword === b.newPassword) return fail(400, "Password baru harus berbeda dari yang lama.");
  const hash = await bcrypt.hash(b.newPassword, 12);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.uid]);
  return ok({ ok: true });
});
