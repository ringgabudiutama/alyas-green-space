// Menjalankan database/schema.sql ke database MySQL yang ada di .env / .env.local
// Pemakaian: npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.local" });
dotenv.config();

const {
  DB_HOST = "127.0.0.1",
  DB_PORT = "3306",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "alyas_green_space",
  DB_SSL = "false",
} = process.env;

const ssl = DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined;

async function main() {
  // 1) pastikan database ada (dilewati jika user tidak punya hak CREATE DATABASE, mis. di cloud)
  try {
    const admin = await mysql.createConnection({
      host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD, ssl,
    });
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME.replace(/`/g, "")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await admin.end();
  } catch (e) {
    console.warn("⚠️  Tidak bisa membuat database otomatis (lanjut):", e.message);
  }

  // 2) jalankan schema
  const conn = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, ssl, multipleStatements: true, charset: "utf8mb4",
  });
  const sql = fs.readFileSync(path.join(process.cwd(), "database", "schema.sql"), "utf8");
  await conn.query(sql);
  await conn.end();
  console.log(`✅ Migrasi selesai pada database "${DB_NAME}".`);
}

main().catch((e) => {
  console.error("❌ Migrasi gagal:", e.message);
  process.exit(1);
});
