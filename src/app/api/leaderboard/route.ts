import { NextResponse } from "next/server";
import { ensureGameSchema, getLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureGameSchema();
    const rows = await getLeaderboard(50);
    return NextResponse.json({ leaderboard: rows });
  } catch (e) {
    console.error("Leaderboard error:", e);
    return NextResponse.json({ leaderboard: [] });
  }
}
