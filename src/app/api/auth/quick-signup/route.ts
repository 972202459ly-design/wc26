import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ensureAuthColumns, getPasswordHash, getOrCreatePlayer } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { neon } from "@neondatabase/serverless";

// Low-friction signup for the Prediction Save Gate: a brand-new email creates a
// free player account instantly (no password) and signs in, so the pending
// prediction can be saved. Existing emails must verify (password or magic link)
// to prevent anyone from claiming someone else's account.
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email || "").toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  await ensureAuthColumns();

  const sql = neon(process.env.DATABASE_URL!);
  const existing = await sql`SELECT 1 FROM subscribers WHERE email = ${email}`;
  if ((existing as unknown[]).length > 0) {
    const hasPassword = !!(await getPasswordHash(email));
    return NextResponse.json({ error: "exists", exists: true, hasPassword }, { status: 409 });
  }

  // New account — create the free player and sign them in immediately.
  await getOrCreatePlayer(email);
  sendWelcomeEmail(email).catch(() => {});

  const token = createSessionToken(email);
  if (!token) return NextResponse.json({ error: "Sign-up temporarily unavailable" }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
