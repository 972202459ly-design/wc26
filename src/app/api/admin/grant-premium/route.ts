import { NextRequest, NextResponse } from "next/server";
import { subscribeEmail, ensureSubscribersTable } from "@/lib/db";

// Simple admin endpoint to manually grant premium.
// Protected by ADMIN_SECRET env var — never expose in client code.
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  await ensureSubscribersTable();
  await subscribeEmail(email.toLowerCase().trim(), "premium");
  return NextResponse.json({ ok: true, email: email.toLowerCase().trim() });
}
