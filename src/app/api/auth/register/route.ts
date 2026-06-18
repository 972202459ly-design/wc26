import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ensureAuthColumns, getPasswordHash, setPassword } from "@/lib/db";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email || "").toLowerCase().trim();
  const password = body.password || "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await ensureAuthColumns();

  // Already has a password → just log in instead.
  if (await getPasswordHash(email)) {
    return NextResponse.json({ error: "Account already exists — please sign in." }, { status: 409 });
  }

  // If the email is already a subscriber (e.g. a paid/premium account created
  // via email signup or purchase), block claiming it without proving ownership
  // — otherwise someone could hijack it. Those users must use the email link.
  const sql = neon(process.env.DATABASE_URL!);
  const existing = await sql`SELECT 1 FROM subscribers WHERE email = ${email}`;
  if ((existing as unknown[]).length > 0) {
    return NextResponse.json(
      { error: "This email already has an account. Use the email sign-in link below, then set a password." },
      { status: 409 }
    );
  }

  await setPassword(email, hashPassword(password));

  const token = createSessionToken(email);
  if (!token) return NextResponse.json({ error: "Sign-up temporarily unavailable" }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
