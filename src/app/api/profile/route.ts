import { execute, queryOne } from "@/lib/db";
import { fail, ok, parseBody, withAuth } from "@/lib/api";
import { profileSchema } from "@/lib/validators";
import { attachSession } from "@/lib/auth";
import { deleteImage } from "@/lib/storage";
import { NextResponse } from "next/server";

export const GET = withAuth(async (_req, user) => {
  const u = await queryOne("SELECT id, full_name, email, bio, quote, photo_url, created_at FROM users WHERE id = ?", [user.uid]);
  return ok({ user: u });
});

export const PUT = withAuth(async (req, user) => {
  const b = await parseBody(req, profileSchema);
  const dup = await queryOne("SELECT id FROM users WHERE email = ? AND id <> ?", [b.email, user.uid]);
  if (dup) return fail(409, "Email sudah dipakai akun lain.");
  const old = await queryOne<{ photo_url: string | null }>("SELECT photo_url FROM users WHERE id = ?", [user.uid]);
  const photo = b.photoUrl === undefined ? old?.photo_url ?? null : b.photoUrl;
  await execute("UPDATE users SET full_name = ?, email = ?, bio = ?, quote = ?, photo_url = ? WHERE id = ?", [
    b.fullName, b.email, b.bio, b.quote, photo, user.uid,
  ]);
  if (old?.photo_url && old.photo_url !== photo) await deleteImage(old.photo_url);
  // perbarui nama di token sesi
  return attachSession(NextResponse.json({ ok: true }), { uid: user.uid, name: b.fullName });
});
