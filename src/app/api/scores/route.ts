import { NextResponse } from "next/server";
import { ensureTable, getAllScores } from "@/lib/db";
import { getWorldCupFixtures } from "@/lib/apifootball";

export async function GET() {
  try {
    await ensureTable();
    const scores = await getAllScores();
    return NextResponse.json({ matches: scores }, {
      headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" },
    });
  } catch (err) {
    console.error("Get scores DB error, falling back to API-Football:", err);
    try {
      const fixtures = await getWorldCupFixtures();
      return NextResponse.json(
        { matches: fixtures.map((f) => f.synced), source: "api-football-fallback" },
        {
          headers: {
            "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
          },
        }
      );
    } catch (fallbackErr: any) {
      console.error("Get scores fallback error:", fallbackErr);
      return NextResponse.json(
        { error: fallbackErr.message || "Failed to fetch scores" },
        { status: 500 }
      );
    }
  }
}

export const dynamic = "force-dynamic";
