import { NextResponse } from "next/server";
import { ensureTable, getAllScores } from "@/lib/db";

export async function GET() {
  try {
    await ensureTable();
    const scores = await getAllScores();
    return NextResponse.json({ matches: scores });
  } catch (err: any) {
    console.error("Get scores error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch scores" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
