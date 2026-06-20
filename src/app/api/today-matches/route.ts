import { NextResponse } from "next/server";
import {
  matches as staticMatches,
  teams,
  getTeamFlagUrl,
  getTeamIdByName,
  stageLabel,
} from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const LIVE_STATUS = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

function teamGroup(teamName: string): string {
  return teams.find((t) => t.name === teamName)?.group ?? "";
}

export async function GET() {
  const now = Date.now();
  const todayUTC = new Date(now).toISOString().slice(0, 10);
  const yesterdayUTC = new Date(now - 86400000).toISOString().slice(0, 10);

  // Today's matches + yesterday's late starters still within 4h window
  let window = staticMatches.filter((m) => {
    if (m.date === todayUTC) return true;
    if (m.date === yesterdayUTC) {
      const ko = new Date(`${m.date}T${m.time}`).getTime();
      return ko > now - 4 * 3600 * 1000;
    }
    return false;
  });

  // Fallback: no matches today → show next 4 upcoming
  if (window.length === 0) {
    window = staticMatches
      .filter((m) => new Date(`${m.date}T${m.time}`).getTime() > now)
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}`).getTime() -
          new Date(`${b.date}T${b.time}`).getTime()
      )
      .slice(0, 4);
  }

  // Pull live scores from DB
  let dbMap = new Map<string, { home_score: number; away_score: number; status: string }>();
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = (await sql`SELECT match_id, home_score, away_score, status FROM match_scores`) as any[];
    dbMap = new Map(rows.map((r) => [r.match_id, r]));
  } catch {
    // Non-fatal — fall back to timestamp-derived status
  }

  const result = window
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`).getTime() -
        new Date(`${b.date}T${b.time}`).getTime()
    )
    .map((m) => {
      const ko = new Date(`${m.date}T${m.time}`).getTime();
      const db = dbMap.get(m.id);

      // Derive status fresh from timestamps (never use stale module-load status)
      let status: "upcoming" | "live" | "finished";
      if (db) {
        if (LIVE_STATUS.has(db.status)) status = "live";
        else if (db.status === "FINISHED") status = "finished";
        else status = ko > now ? "upcoming" : "live";
      } else {
        status = ko > now ? "upcoming" : ko > now - 115 * 60 * 1000 ? "live" : "finished";
      }

      const homeId = getTeamIdByName(m.homeTeam) ?? m.id.split("-")[0];
      const awayId = getTeamIdByName(m.awayTeam) ?? m.id.split("-")[1];
      const pred = predictMatch(m.homeTeam, m.awayTeam);

      return {
        id: m.id,
        home: m.homeTeam,
        away: m.awayTeam,
        homeFlag: getTeamFlagUrl(homeId),
        awayFlag: getTeamFlagUrl(awayId),
        utc_date: `${m.date}T${m.time}`,
        stage: stageLabel(m.stage),
        group: teamGroup(m.homeTeam),
        status,
        homeScore: db ? db.home_score : null,
        awayScore: db ? db.away_score : null,
        prediction: {
          homePct: pred.homePct,
          drawPct: pred.drawPct,
          awayPct: pred.awayPct,
          scoreHome: pred.topHome,
          scoreAway: pred.topAway,
        },
      };
    });

  return NextResponse.json(result);
}
