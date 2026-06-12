import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM subscribers WHERE email = ${email}`;

  return NextResponse.redirect(
    new URL(`/unsubscribe?done=1&email=${encodeURIComponent(email)}`, request.url)
  );
}
