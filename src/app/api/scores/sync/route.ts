import { NextResponse } from "next/server";
import {
  ensureTable,
  ensureSubscribersTable,
  upsertMatch,
  getAllScores,
  getSubscribers,
} from "@/lib/db";
import type { SyncedMatch } from "@/lib/db";
import { sendKickoffEmails, sendGoalEmails, sendFinalEmails, type ScoreChange } from "@/lib/email";
import { getWorldCupFixtures, getGoalEvents } from "@/lib/apifootball";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (CRON_SECRET && key !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTable();
    await ensureSubscribersTable();

    const fixtures = await getWorldCupFixtures();
    const matches: SyncedMatch[] = fixtures.map((f) => f.synced);
    const halfTimeScores = new Map<number, { home: number; away: number }>();
    for (const f of fixtures) if (f.halfTime) halfTimeScores.set(f.synced.api_id, f.halfTime);

    // One DB read for all prior states (cheap for frequent polling).
    const prior = await getAllScores();
    const priorByApiId = new Map(prior.map((s) => [s.api_id, s]));

    const kickoffChanges: ScoreChange[] = [];
    const goalChanges: Array<{ change: ScoreChange; apiId: number }> = [];
    const finalChanges: ScoreChange[] = [];

    for (const m of matches) {
      if (m.home_score === null || m.away_score === null) continue;

      const old = priorByApiId.get(m.api_id);
      const hasOld = old != null && old.home_score !== null && old.away_score !== null;
      const oldStatus = old?.status;
      const ht = halfTimeScores.get(m.api_id);

      const matchScore: ScoreChange = {
        home_team: m.home_team,
        away_team: m.away_team,
        home_score: m.home_score,
        away_score: m.away_score,
        status: m.status,
        stage: m.stage,
        prev_home_score: hasOld ? old!.home_score : undefined,
        prev_away_score: hasOld ? old!.away_score : undefined,
        half_time_home: ht?.home ?? undefined,
        half_time_away: ht?.away ?? undefined,
        utc_date: m.utc_date,
        match_id: m.match_id,
      };

      const isKickoff = oldStatus && oldStatus !== "IN_PLAY" && oldStatus !== "PAUSED" && m.status === "IN_PLAY";
      const isFinished = oldStatus && oldStatus !== "FINISHED" && m.status === "FINISHED";
      const isGoal =
        hasOld &&
        (old!.home_score !== m.home_score || old!.away_score !== m.away_score) &&
        !isKickoff;

      if (isKickoff) kickoffChanges.push(matchScore);
      else if (isGoal) goalChanges.push({ change: matchScore, apiId: m.api_id });
      if (isFinished) finalChanges.push(matchScore);
    }

    // Enrich goal alerts with the scorer (latest goal event for that fixture).
    await Promise.all(
      goalChanges.map(async ({ change, apiId }) => {
        const events = await getGoalEvents(apiId);
        const last = events[events.length - 1];
        if (last) {
          change.scorer = last.scorer;
          change.goal_minute = last.minute;
          change.assist = last.assist;
        }
      })
    );

    // Upsert all matches.
    let updated = 0;
    for (const m of matches) {
      await upsertMatch(m);
      updated++;
    }

    // Send emails by preference.
    const allSubs = await getSubscribers();
    // "premium" gets every alert type (paid Tournament Pass holders).
    const premiumSubs = allSubs.filter((s) => s.preferences === "premium");
    const allPrefSubs = allSubs.filter((s) => s.preferences === "all");
    const goalsPrefSubs = allSubs.filter((s) => s.preferences === "goals");
    const dailyPrefSubs = allSubs.filter((s) => s.preferences === "daily");

    const kickoffSubs = [...premiumSubs, ...allPrefSubs, ...dailyPrefSubs];
    const kickoffResult = await sendKickoffEmails(kickoffSubs, kickoffChanges);

    const goalSubs = [...premiumSubs, ...allPrefSubs, ...goalsPrefSubs, ...dailyPrefSubs];
    const goalResult = await sendGoalEmails(goalSubs, goalChanges.map((g) => g.change));

    const finalSubs = [...premiumSubs, ...allPrefSubs, ...dailyPrefSubs];
    const finalResult = await sendFinalEmails(finalSubs, finalChanges);

    const totalSent = kickoffResult.sent + goalResult.sent + finalResult.sent;
    const totalFailed = kickoffResult.failed + goalResult.failed + finalResult.failed;
    const liveCount = matches.filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED").length;

    return NextResponse.json({
      success: true,
      source: "api-football",
      updated,
      total: matches.length,
      live: liveCount,
      kickoffs: kickoffChanges.length,
      goals: goalChanges.length,
      finals: finalChanges.length,
      emailsSent: totalSent,
      emailsFailed: totalFailed,
    });
  } catch (err: any) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
