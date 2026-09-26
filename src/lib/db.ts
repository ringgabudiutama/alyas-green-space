import "server-only";
import mysql from "mysql2/promise";
import type { Pool, ResultSetHeader } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __agsPool: Pool | undefined;
}

function createPool(): Pool {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "alyas_green_space",
    ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    charset: "utf8mb4",
    // DATE/DATETIME dikembalikan sebagai string "YYYY-MM-DD" agar tidak bergeser zona waktu
    dateStrings: true,
    // DECIMAL dikembalikan sebagai number
    decimalNumbers: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 5),
    waitForConnections: true,
    enableKeepAlive: true,
  });
}

/** Pool dipakai ulang antar request (dan antar hot-reload saat dev). */
export function getPool(): Pool {
  if (!global.__agsPool) global.__agsPool = createPool();
  return global.__agsPool;
}

type Param = string | number | boolean | null | Date | Buffer | Param[];

/**
 * SELECT. Semua nilai WAJIB lewat placeholder `?` — mysql2 meng-escape nilainya,
 * sehingga aman dari SQL injection.
 */
export async function query<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** INSERT / UPDATE / DELETE */
export async function execute(sql: string, params: Param[] = []): Promise<ResultSetHeader> {
  const [res] = await getPool().query(sql, params);
  return res as ResultSetHeader;
}

/** Transaksi database sederhana */
export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
