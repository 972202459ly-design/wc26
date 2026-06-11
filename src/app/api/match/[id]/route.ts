import { getMatchById } from "@/lib/data";
import { NextResponse } from "next/server";
import { ensureTable, getAllScores } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = getMatchById(id);

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Overlay live scores from DB if available
  try {
    await ensureTable();
    const scores = await getAllScores();
    const live = scores.find(
      (s) =>
        s.home_team === match.homeTeam && s.away_team === match.awayTeam
    );

    if (live) {
      const statusMap: Record<string, "upcoming" | "live" | "finished"> = {
        TIMED: "upcoming",
        SCHEDULED: "upcoming",
        IN_PLAY: "live",
        PAUSED: "live",
        FINISHED: "finished",
        SUSPENDED: "live",
        POSTPONED: "upcoming",
        CANCELLED: "upcoming",
      };

      match.homeScore = live.home_score;
      match.awayScore = live.away_score;
      match.status = statusMap[live.status] ?? "upcoming";
    }
  } catch {
    // DB unavailable — return static data as-is
  }

  return NextResponse.json(match);
}
