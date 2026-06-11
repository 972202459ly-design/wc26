import { NextResponse } from "next/server";
import { ensureTable, ensureSubscribersTable, upsertMatch, getScoreByApiId, getSubscribers } from "@/lib/db";
import type { SyncedMatch } from "@/lib/db";
import { sendKickoffEmails, sendGoalEmails, sendFinalEmails, type ScoreChange } from "@/lib/email";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

interface RawMatch {
  id: number;
  homeTeam?: { name?: string; tla?: string };
  awayTeam?: { name?: string; tla?: string };
  score?: { fullTime?: { home?: number; away?: number }; halfTime?: { home?: number; away?: number } };
  status: string;
  stage: string;
  group?: string;
  utcDate: string;
}

async function fetchFromFootballData(): Promise<{ matches: SyncedMatch[]; halfTimeScores: Map<number, { home: number; away: number }> }> {
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/2000/matches?season=2026",
    { headers: { "X-Auth-Token": API_KEY } }
  );

  if (!res.ok) {
    throw new Error(`football-data.org returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const halfTimeScores = new Map<number, { home: number; away: number }>();

  const matches: SyncedMatch[] = data.matches.map((m: RawMatch) => {
    if (!m.homeTeam || !m.awayTeam) {
      console.warn(`Match ${m.id} missing team:`, JSON.stringify({ homeTeam: m.homeTeam, awayTeam: m.awayTeam }));
    }

    const homeTla = m.homeTeam?.tla || m.homeTeam?.name || "unknown";
    const awayTla = m.awayTeam?.tla || m.awayTeam?.name || "unknown";

    if (m.score?.halfTime?.home != null && m.score?.halfTime?.away != null) {
      halfTimeScores.set(m.id, { home: m.score.halfTime.home, away: m.score.halfTime.away });
    }

    return {
      api_id: m.id,
      match_id: `${homeTla.toLowerCase()}-${awayTla.toLowerCase()}`,
      home_team: m.homeTeam?.name ?? "Unknown",
      away_team: m.awayTeam?.name ?? "Unknown",
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      status: m.status,
      stage: m.stage,
      group_name: m.group,
      utc_date: m.utcDate,
    };
  });

  return { matches, halfTimeScores };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (CRON_SECRET && key !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTable();
    await ensureSubscribersTable();

    const { matches, halfTimeScores } = await fetchFromFootballData();

    // Categorize changes
    const kickoffChanges: ScoreChange[] = [];
    const goalChanges: ScoreChange[] = [];
    const finalChanges: ScoreChange[] = [];

    for (const m of matches) {
      if (m.home_score === null || m.away_score === null) continue;

      const old = await getScoreByApiId(m.api_id);

      const hasOld = old && old.home_score !== null && old.away_score !== null;
      const newStatus = m.status;
      const oldStatus = old?.status;

      const ht = halfTimeScores.get(m.api_id);

      const matchScore: ScoreChange = {
        home_team: m.home_team,
        away_team: m.away_team,
        home_score: m.home_score,
        away_score: m.away_score,
        status: m.status,
        stage: m.stage,
        prev_home_score: hasOld ? old.home_score : undefined,
        prev_away_score: hasOld ? old.away_score : undefined,
        half_time_home: ht?.home ?? undefined,
        half_time_away: ht?.away ?? undefined,
        utc_date: m.utc_date,
        match_id: m.match_id,
      };

      const isKickoff = oldStatus && oldStatus !== "IN_PLAY" && oldStatus !== "PAUSED" && newStatus === "IN_PLAY";
      const isFinished = oldStatus && oldStatus !== "FINISHED" && newStatus === "FINISHED";
      const isGoal = hasOld &&
        (old.home_score !== m.home_score || old.away_score !== m.away_score) &&
        !isKickoff;

      if (isKickoff) kickoffChanges.push(matchScore);
      else if (isGoal) goalChanges.push(matchScore);
      if (isFinished) finalChanges.push(matchScore);
    }

    // Upsert all matches
    let updated = 0;
    for (const m of matches) {
      await upsertMatch(m);
      updated++;
    }

    // Send emails — filter subscribers by preference
    const allSubs = await getSubscribers();

    // "all" gets everything; "goals" gets only goals
    const allPrefSubs = allSubs.filter((s) => s.preferences === "all");
    const goalsPrefSubs = allSubs.filter((s) => s.preferences === "goals");

    // Kickoff → "all" only
    const kickoffResult = await sendKickoffEmails(allPrefSubs, kickoffChanges);

    // Goals → "all" + "goals"
    const goalSubs = [...allPrefSubs, ...goalsPrefSubs];
    const goalResult = await sendGoalEmails(goalSubs, goalChanges);

    // Finals → "all" only
    const finalResult = await sendFinalEmails(allPrefSubs, finalChanges);

    const totalSent = kickoffResult.sent + goalResult.sent + finalResult.sent;
    const totalFailed = kickoffResult.failed + goalResult.failed + finalResult.failed;

    return NextResponse.json({
      success: true,
      updated,
      total: matches.length,
      kickoffs: kickoffChanges.length,
      goals: goalChanges.length,
      finals: finalChanges.length,
      emailsSent: totalSent,
      emailsFailed: totalFailed,
    });
  } catch (err: any) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
