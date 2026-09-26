import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { getSession } from "./auth";
import type { SessionPayload } from "./jwt";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any;

/**
 * Wrapper route handler: memastikan user login (protected API),
 * menangani error validasi & error server secara konsisten.
 */
export function withAuth(fn: (req: NextRequest, user: SessionPayload, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      const user = await getSession();
      if (!user) return fail(401, "Silakan login terlebih dahulu.");
      return await fn(req, user, ctx);
    } catch (e) {
      return handleError(e);
    }
  };
}

export function handleError(e: unknown): Response {
  if (e instanceof HttpError) return fail(e.status, e.message);
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return fail(400, first ? `${first.path.join(".") || "input"}: ${first.message}` : "Input tidak valid.", {
      issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  console.error("[API ERROR]", e);
  return fail(500, "Terjadi kesalahan di server. Coba lagi sebentar ya.");
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Body request harus berupa JSON.");
  }
  return schema.parse(json);
}

/** Ambil & validasi param [id] dari route dinamis */
export async function idFrom(ctx: Ctx, key = "id"): Promise<number> {
  const params = await ctx?.params;
  const id = Number(params?.[key]);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID tidak valid.");
  return id;
}

export function notFound(what = "Data"): never {
  throw new HttpError(404, `${what} tidak ditemukan.`);
}
