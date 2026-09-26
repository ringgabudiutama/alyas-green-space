import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { HttpError } from "./api";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** Deteksi tipe gambar dari "magic bytes" — tidak percaya ekstensi / MIME dari browser */
function sniffImage(buf: Buffer): { ext: "jpg" | "png" | "webp" | "gif"; mime: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a") return { ext: "gif", mime: "image/gif" };
  return null;
}

export const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/** Simpan gambar: ke Vercel Blob bila token tersedia, jika tidak ke folder ./uploads */
export async function saveImage(file: File, uid: number): Promise<string> {
  if (file.size === 0) throw new HttpError(400, "File kosong.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Ukuran foto maksimal 5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) throw new HttpError(415, "Format foto harus JPG, PNG, WEBP, atau GIF.");
  const name = `${randomUUID()}.${kind.ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${uid}/${name}`, buf, {
      access: "public",
      contentType: kind.mime,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, name), buf);
  return `/api/files/${name}`;
}

export async function deleteImage(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith("/api/files/")) {
      const name = url.replace("/api/files/", "");
      if (/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(name)) await fs.unlink(path.join(LOCAL_UPLOAD_DIR, name));
    } else if (process.env.BLOB_READ_WRITE_TOKEN && url.includes(".blob.vercel-storage.com")) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    /* best effort */
  }
}
