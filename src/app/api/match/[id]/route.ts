import { getMatchById } from "@/lib/data";
import { NextResponse } from "next/server";
import { ensureTable, getAllScores } from "@/lib/db";
import { getMatchEvents } from "@/lib/apifootball";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = getMatchById(id);

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  let events: unknown[] = [];

  try {
    await ensureTable();
    const scores = await getAllScores();
    // Match by match_id (consistent with the API-Football sync), not team names.
    const live = scores.find((s) => s.match_id === id);

    if (live) {
      const statusMap: Record<string, "upcoming" | "live" | "finished"> = {
        TIMED: "upcoming",
        IN_PLAY: "live",
        PAUSED: "live",
        FINISHED: "finished",
      };

      match.homeScore = live.home_score;
      match.awayScore = live.away_score;
      match.status = statusMap[live.status] ?? "upcoming";

      // Live text-commentary events for in-play / finished matches.
      if (live.status === "IN_PLAY" || live.status === "PAUSED" || live.status === "FINISHED") {
        const raw = await getMatchEvents(live.api_id);
        events = raw.map((e) => ({
          minute: e.minute,
          type: e.type,
          team: e.teamName === live.away_team ? "away" : "home",
          player: e.player,
          assist: e.assist,
          detail: e.detail,
        }));
      }
    }
  } catch {
    // DB / API unavailable — return static data with no events.
  }

  return NextResponse.json({ ...match, events });
}

export const dynamic = "force-dynamic";
