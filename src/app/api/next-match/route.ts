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
  getTierByEmail,
} from "@/lib/db";
import { neon } from "@neondatabase/serverless";
import { getWorldCupFixtures } from "@/lib/apifootball";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const LIVE = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

type ScoreRow = {
  match_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  utc_date?: string;
  stage?: string | null;
};

function isConcreteTeam(name: string): boolean {
  return name !== "tbd";
}

function isConcreteStaticMatch(match: { homeTeam: string; awayTeam: string }): boolean {
  return isConcreteTeam(match.homeTeam) && isConcreteTeam(match.awayTeam);
}

function scoreRowFromApiFixture(row: ScoreRow) {
  const home = row.home_team;
  const away = row.away_team;
  const p = predictMatch(home, away);
  return NextResponse.json({
    id: row.match_id,
    home,
    away,
    homeFlag: getTeamFlagUrl(getTeamIdByName(home) ?? ""),
    awayFlag: getTeamFlagUrl(getTeamIdByName(away) ?? ""),
    utc_date: row.utc_date ?? new Date().toISOString(),
    stage: stageLabel(row.stage ?? "GROUP_STAGE"),
    isLive: LIVE.has(row.status),
    homeScore: row.home_score,
    awayScore: row.away_score,
    prediction: {
      homePct: p.homePct,
      drawPct: p.drawPct,
      awayPct: p.awayPct,
      scoreHome: p.topHome,
      scoreAway: p.topAway,
    },
    preview: { teaser: null, full: null, locked: false },
    predictorCount: 0,
    totalPlayers: 0,
  });
}

export async function GET() {
  const now = Date.now();
  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

  try {
    const rows: ScoreRow[] = sql
      ? ((await sql`
          SELECT match_id, home_team, away_team, home_score, away_score, status, utc_date, stage
          FROM match_scores
        `) as ScoreRow[])
      : [];
    const liveRow = rows.find(
      (r) => LIVE.has(r.status) && isConcreteTeam(r.home_team) && isConcreteTeam(r.away_team)
    );

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
        utc_date: sm ? `${sm.date}T${sm.time}` : liveRow.utc_date ?? new Date().toISOString(),
        stage: stageLabel(sm?.stage ?? liveRow.stage ?? "GROUP_STAGE"),
        isLive: true,
        homeScore: liveRow.home_score,
        awayScore: liveRow.away_score,
      });
    }
  } catch (err) {
    console.error("next-match live lookup error:", err);
  }

  const next = staticMatches
    .filter(isConcreteStaticMatch)
    .filter((m) => new Date(`${m.date}T${m.time}`).getTime() > now)
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`).getTime() -
        new Date(`${b.date}T${b.time}`).getTime()
    )[0];

  if (!next) {
    try {
      const apiRows = (await getWorldCupFixtures())
        .map((f) => f.synced)
        .filter((r) => isConcreteTeam(r.home_team) && isConcreteTeam(r.away_team))
        .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime());
      const live = apiRows.find((r) => LIVE.has(r.status));
      const upcoming = apiRows.find((r) => new Date(r.utc_date).getTime() > now);
      const fallback = live ?? upcoming;
      if (fallback) return scoreRowFromApiFixture(fallback);
    } catch (err) {
      console.error("next-match API-Football fallback error:", err);
    }
    return NextResponse.json({ match: null });
  }

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
  } catch (err) {
    console.error("Next-match preview error:", err);
  }

  let isPremium = false;
  try {
    const session = await getSession();
    isPremium = session ? (await getTierByEmail(session.email)) === "premium" : false;
  } catch {
    isPremium = false;
  }

  let predictorCount = 0;
  let totalPlayers = 0;
  try {
    predictorCount = await getMatchPredictorCount(id);
    if (sql) {
      const [tp] = (await sql`
        SELECT COUNT(*)::int AS c FROM subscribers WHERE preferences <> 'deleted'
      `) as { c: number }[];
      totalPlayers = tp?.c ?? 0;
    }
  } catch (err) {
    console.error("next-match stats error:", err);
  }

  const teaser = full ? full.split(/(?<=[.!?])\s/)[0] : null;

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
    preview: { teaser, full: isPremium ? full : null, locked: !isPremium && !!full },
    predictorCount,
    totalPlayers,
  });
}
