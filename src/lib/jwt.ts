// Edge-safe (dipakai juga oleh middleware). Jangan import modul Node di sini.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ags_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

export type SessionPayload = { uid: number; name: string };

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET belum di-set atau kurang dari 32 karakter.");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.uid))
    .setIssuedAt()
    .setIssuer("alyas-green-space")
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: "alyas-green-space",
    });
    const uid = Number(payload.sub);
    if (!Number.isInteger(uid) || uid <= 0) return null;
    return { uid, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
