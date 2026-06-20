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

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const LIVE = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const now = Date.now();

    // Live detection: only match_scores knows real-time status
    const rows = (await sql`
      SELECT match_id, home_team, away_team, home_score, away_score, status
      FROM match_scores
    `) as any[];
    const liveRow = rows.find((r) => LIVE.has(r.status));

    if (liveRow) {
      const sm = staticMatches.find((s) => s.id === liveRow.match_id);
      const home = sm?.homeTeam ?? liveRow.home_team;
      const away = sm?.awayTeam ?? liveRow.away_team;
      return NextResponse.json({
        id: liveRow.match_id,
        home,
        away,
        homeFlag: getTeamFlagUrl(getTeamIdByName(home) ?? ""),
        awayFlag: getTeamFlagUrl(getTeamIdByName(away) ?? ""),
        utc_date: sm ? `${sm.date}T${sm.time}` : new Date().toISOString(),
        stage: stageLabel(sm?.stage ?? "GROUP_STAGE"),
        isLive: true,
        homeScore: liveRow.home_score,
        awayScore: liveRow.away_score,
      });
    }

    // Next upcoming: use static schedule (compare timestamps directly — status field is cached at module load)
    const next = staticMatches
      .filter((m) => new Date(`${m.date}T${m.time}`).getTime() > now)
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())[0];

    if (!next) return NextResponse.json({ match: null });

    const { id, homeTeam: home, awayTeam: away, date, time, stage } = next;
    const utc_date = `${date}T${time}`;

    const p = predictMatch(home, away);
    let full: string | null = null;
    try {
      await ensurePredictionsTable();
      full = await getCachedAnalysis(id);
      if (!full) {
        full = await generateAnalysis(home, away, stageLabel(stage), p);
        if (full) await upsertAnalysis(id, full);
      }
    } catch (e) {
      console.error("Next-match preview error:", e);
    }

    const session = await getSession();
    const loggedIn = !!session;
    const teaser = full ? full.split(/(?<=[.!?])\s/)[0] : null;
    const predictorCount = await getMatchPredictorCount(id);
    const [tp] = (await sql`SELECT COUNT(*)::int AS c FROM subscribers WHERE preferences <> 'deleted'`) as any[];

    return NextResponse.json({
      id,
      home,
      away,
      homeFlag: getTeamFlagUrl(getTeamIdByName(home) ?? ""),
      awayFlag: getTeamFlagUrl(getTeamIdByName(away) ?? ""),
      utc_date,
      stage: stageLabel(stage),
      isLive: false,
      prediction: {
        homePct: p.homePct,
        drawPct: p.drawPct,
        awayPct: p.awayPct,
        scoreHome: p.topHome,
        scoreAway: p.topAway,
      },
      preview: { teaser, full: loggedIn ? full : null, locked: !loggedIn && !!full },
      predictorCount,
      totalPlayers: tp?.c ?? 0,
    });
  } catch (err: any) {
    console.error("next-match error:", err);
    return NextResponse.json({ match: null });
  }
}
