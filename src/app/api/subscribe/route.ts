import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, preferences } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!); // runtime only — safe
    const result = await sql`
      INSERT INTO subscribers (email, preferences, created_at)
      VALUES (${email}, ${preferences || "daily"}, NOW())
      ON CONFLICT (email) DO UPDATE SET preferences = ${preferences || "daily"}
      RETURNING id, email, preferences
    `;

    return NextResponse.json({ success: true, subscriber: result[0] });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
