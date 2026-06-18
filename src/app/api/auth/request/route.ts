import { NextRequest, NextResponse } from "next/server";
import { createMagicToken } from "@/lib/auth";
import { sendMagicLink } from "@/lib/email";

const SITE = "https://wc26live.org";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const token = createMagicToken(email);
    if (!token) {
      // AUTH_SECRET missing — fail loudly server-side, generic message to client.
      return NextResponse.json({ error: "Sign-in is temporarily unavailable" }, { status: 500 });
    }

    const url = `${SITE}/api/auth/verify?token=${encodeURIComponent(token)}`;
    // Fire-and-forget; always return success so we don't leak who has an account.
    sendMagicLink(email.toLowerCase().trim(), url).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
