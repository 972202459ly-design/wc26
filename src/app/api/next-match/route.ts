import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  matches as staticMatches,
  getTeamIdByName,
  getTeamFlagUrl,
  stageLabel,
} from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { generateAnalysis } from "@/lib/ai";
import {
  ensurePredictionsTable,
  getCachedAnalysis,
  upsertAnalysis,
  getMatchPredictorCount,
} from "@/lib/db";
import { neon } from "@neondatabase/serverless";

// First (uncached) preview calls the LLM (~8s); generous headroom, cached after.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const LIVE = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

// Featured match for the homepage: a live match if one is on, otherwise the
// next upcoming fixture with an AI preview (full text gated behind sign-in).
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = (await sql`
      SELECT match_id, home_team, away_team, home_score, away_score, status, stage, utc_date
      FROM match_scores
    `) as any[];

    const now = Date.now();
    const live = rows.find((r) => LIVE.has(r.status));
    const upcoming = rows
      .filter((r) => new Date(r.utc_date).getTime() > now)
      .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime())[0];
    const m = live || upcoming;
    if (!m) return NextResponse.json({ match: null });

    const sm = staticMatches.find((s) => s.id === m.match_id);
    const home = sm?.homeTeam ?? m.home_team;
    const away = sm?.awayTeam ?? m.away_team;
    const base = {
      id: m.match_id,
      home,
      away,
      homeFlag: getTeamFlagUrl(getTeamIdByName(home) ?? ""),
      awayFlag: getTeamFlagUrl(getTeamIdByName(away) ?? ""),
      utc_date: m.utc_date,
      stage: stageLabel(m.stage),
      isLive: !!live,
    };

    if (live) {
      return NextResponse.json({ ...base, homeScore: m.home_score, awayScore: m.away_score });
    }

    // Upcoming: AI prediction + preview + social proof.
    const p = predictMatch(home, away);
    let full: string | null = null;
    try {
      await ensurePredictionsTable();
      full = await getCachedAnalysis(m.match_id);
      if (!full) {
        full = await generateAnalysis(home, away, stageLabel(m.stage), p);
        if (full) await upsertAnalysis(m.match_id, full);
      }
    } catch (e) {
      console.error("Next-match preview error:", e);
    }

    const session = await getSession();
    const loggedIn = !!session;
    const teaser = full ? full.split(/(?<=[.!?])\s/)[0] : null;
    const predictorCount = await getMatchPredictorCount(m.match_id);
    // Aggregate, bot-inclusive player count — the field you compete against on
    // the board. A bigger, honest number than a single match's predictor count.
    const [tp] = (await sql`SELECT COUNT(*)::int AS c FROM subscribers WHERE preferences <> 'deleted'`) as any[];
    const totalPlayers = tp?.c ?? 0;

    return NextResponse.json({
      ...base,
      prediction: {
        homePct: p.homePct,
        drawPct: p.drawPct,
        awayPct: p.awayPct,
        scoreHome: p.topHome,
        scoreAway: p.topAway,
      },
      preview: { teaser, full: loggedIn ? full : null, locked: !loggedIn && !!full },
      predictorCount,
      totalPlayers,
    });
  } catch (err: any) {
    console.error("next-match error:", err);
    return NextResponse.json({ match: null });
  }
}
