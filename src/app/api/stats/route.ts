import { NextResponse } from "next/server";
import { getHomeStats } from "@/lib/db";

export const dynamic = "force-dynamic";

// Homepage social proof: player count + current top score.
export async function GET() {
  try {
    const stats = await getHomeStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ players: 0, topName: null, topPoints: 0 });
  }
}
