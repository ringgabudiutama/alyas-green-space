// Halaman cek kesehatan: /api/health
// Menampilkan apakah environment variable terbaca & apakah database bisa disambung.
// Tidak menampilkan password / secret.
import mysql from "mysql2/promise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const e = process.env;
  const has = (k: string) => (e[k] ? "✅ ada" : "❌ KOSONG");
  const jwtLen = e.JWT_SECRET?.length ?? 0;
  const out: Record<string, string> = {
    DB_HOST: e.DB_HOST || "❌ KOSONG",
    DB_PORT: e.DB_PORT || "❌ KOSONG",
    DB_USER: has("DB_USER"),
    DB_PASSWORD: has("DB_PASSWORD"),
    DB_NAME: e.DB_NAME || "❌ KOSONG",
    DB_SSL: e.DB_SSL || "❌ KOSONG",
    JWT_SECRET: jwtLen >= 32 ? "✅ ok" : `❌ panjang ${jwtLen} (minimal 32)`,
  };
  try {
    const c = await mysql.createConnection({
      host: e.DB_HOST,
      port: Number(e.DB_PORT || 3306),
      user: e.DB_USER,
      password: e.DB_PASSWORD,
      database: e.DB_NAME,
      ssl: e.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
      connectTimeout: 8000,
    });
    const [rows] = await c.query("SELECT COUNT(*) AS n FROM users");
    out.database = `✅ tersambung, jumlah user: ${(rows as { n: number }[])[0].n}`;
    await c.end();
  } catch (err) {
    const x = err as { code?: string; message?: string };
    out.database = `❌ ${x.code ?? ""} ${x.message ?? ""}`.trim();
  }
  return Response.json(out);
}
