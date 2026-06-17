import { NextRequest, NextResponse } from "next/server";
import { ensureSubscribersTable, subscribeEmail } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    await ensureSubscribersTable();
    // New tiering: free signups are "free" (final scores only). Real-time
    // alerts are the premium tier (granted via Paddle purchase).
    const subscriber = await subscribeEmail(email, "free");

    // Fire-and-forget welcome email (whitelist guidance for deliverability).
    sendWelcomeEmail(email).catch(() => {});

    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
