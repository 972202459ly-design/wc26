import { NextResponse } from "next/server";
import { ensureGameSchema, getTeamLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureGameSchema();
  const rows = await getTeamLeaderboard();
  return NextResponse.json({ rows });
}
