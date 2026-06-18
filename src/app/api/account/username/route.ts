import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureGameSchema, setUsername } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = (body.username || "").trim();
  if (username.length < 2 || username.length > 20) {
    return NextResponse.json({ error: "Username must be 2–20 characters" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9 _.\-]+$/.test(username)) {
    return NextResponse.json({ error: "Use letters, numbers, spaces, _ . -" }, { status: 400 });
  }

  await ensureGameSchema();
  await setUsername(session.email, username);
  return NextResponse.json({ ok: true, username });
}
