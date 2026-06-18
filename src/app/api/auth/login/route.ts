import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ensureAuthColumns, getPasswordHash } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email || "").toLowerCase().trim();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  await ensureAuthColumns();
  const stored = await getPasswordHash(email);
  if (!stored) {
    return NextResponse.json(
      { error: "No password set for this account. Use the email sign-in link below, then set a password." },
      { status: 401 }
    );
  }
  if (!verifyPassword(password, stored)) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const token = createSessionToken(email);
  if (!token) return NextResponse.json({ error: "Sign-in temporarily unavailable" }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
