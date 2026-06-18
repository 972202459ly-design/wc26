import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getTierByEmail } from "./db";

// ─── Lightweight passwordless auth ────────────────────────────────────
// No password store. A magic link proves the visitor owns an email; the
// session cookie carries only that verified email (signed, tamper-proof).
// The user's tier (free/premium) is always looked up fresh from the DB on
// each request, so a purchase made after sign-in unlocks without re-login.

export const SESSION_COOKIE = "wc26_sess";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days
const MAGIC_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

export type Tier = "free" | "premium";
export interface Session {
  email: string;
  tier: Tier;
}

function secret(): string | null {
  return process.env.AUTH_SECRET || null;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

// token = base64url(payloadJson) + "." + base64url(hmac)
// payload = { e: email, p: purpose, t: issuedAtMs }
function sign(email: string, purpose: "m" | "s"): string | null {
  const key = secret();
  if (!key) {
    console.error("AUTH_SECRET not set — cannot sign auth token");
    return null;
  }
  const payload = b64url(JSON.stringify({ e: email, p: purpose, t: Date.now() }));
  const sig = b64url(createHmac("sha256", key).update(payload).digest());
  return `${payload}.${sig}`;
}

function verify(token: string | undefined, purpose: "m" | "s", maxAgeMs: number): string | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64url(createHmac("sha256", key).update(payload).digest());
  // constant-time compare to avoid signature-guessing timing leaks
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.p !== purpose) return null;
    if (typeof data.t !== "number" || Date.now() - data.t > maxAgeMs) return null;
    if (typeof data.e !== "string" || !data.e) return null;
    return data.e as string;
  } catch {
    return null;
  }
}

// ── Magic link (email ownership proof, short-lived) ──

export function createMagicToken(email: string): string | null {
  return sign(email.toLowerCase().trim(), "m");
}

export function verifyMagicToken(token: string | undefined): string | null {
  return verify(token, "m", MAGIC_MAX_AGE_MS);
}

// ── Session (long-lived cookie) ──

export function createSessionToken(email: string): string | null {
  return sign(email.toLowerCase().trim(), "s");
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
};

/** Read the current request's session (verified email + fresh DB tier). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const email = verify(token, "s", SESSION_MAX_AGE_S * 1000);
  if (!email) return null;
  const tier = await getTierByEmail(email);
  return { email, tier };
}

/** Tier of the current visitor; "free" when not signed in. */
export async function getTier(): Promise<Tier> {
  const session = await getSession();
  return session?.tier ?? "free";
}
