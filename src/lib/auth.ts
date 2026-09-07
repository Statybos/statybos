import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "statybos_session";

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-secret-statybos-personalo",
  );
}

export type Session = { email: string };

export async function createSession(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const email = typeof payload.email === "string" ? payload.email : null;
    return email ? { email } : null;
  } catch {
    return null;
  }
}

export function verifyCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL || "admin@statybos.lt";
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
  return email.trim().toLowerCase() === expectedEmail.toLowerCase() &&
    password === expectedPassword;
}
