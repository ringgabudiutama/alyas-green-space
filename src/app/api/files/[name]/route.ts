import { promises as fs } from "node:fs";
import path from "node:path";
import { queryOne } from "@/lib/db";
import { fail, withAuth } from "@/lib/api";
import { LOCAL_UPLOAD_DIR, MIME_BY_EXT } from "@/lib/storage";

export const runtime = "nodejs";

// Menyajikan foto lokal HANYA untuk pemiliknya (user ownership checking)
export const GET = withAuth(async (_req, user, ctx) => {
  const { name } = (await ctx.params) as { name: string };
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(name)) return fail(400, "Nama file tidak valid.");
  const url = `/api/files/${name}`;
  const owned =
    (await queryOne("SELECT id FROM journal_photos WHERE url = ? AND user_id = ? LIMIT 1", [url, user.uid])) ||
    (await queryOne("SELECT id FROM users WHERE photo_url = ? AND id = ? LIMIT 1", [url, user.uid]));
  // File yang baru di-upload tetapi belum disimpan ke journal: izinkan pratinjau hanya bila baru (< 1 jam)
  let fresh = false;
  const filePath = path.join(LOCAL_UPLOAD_DIR, name);
  try {
    const st = await fs.stat(filePath);
    fresh = Date.now() - st.mtimeMs < 60 * 60 * 1000;
  } catch {
    return fail(404, "File tidak ditemukan.");
  }
  if (!owned && !fresh) return fail(404, "File tidak ditemukan.");
  const data = await fs.readFile(filePath);
  const ext = name.split(".").pop()!;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
