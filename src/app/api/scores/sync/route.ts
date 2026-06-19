import { NextResponse } from "next/server";
import {
  ensureTable,
  ensureSubscribersTable,
  ensureGameSchema,
  settleOpenPicks,
  upsertMatch,
  getAllScores,
  getSubscribers,
  getMatchPickStats,
  getSettledPicksForMatches,
  getRankedPlayers,
} from "@/lib/db";
import type { SyncedMatch } from "@/lib/db";
import {
  sendKickoffEmails,
  sendGoalEmails,
  sendFinalEmails,
  sendBigEventEmails,
  type ScoreChange,
  type BigEvent,
  type PersonalPick,
  type DigestRank,
} from "@/lib/email";
import { getWorldCupFixtures, getGoalEvents } from "@/lib/apifootball";
import { matches as staticMatches } from "@/lib/data";
import { predictMatch } from "@/lib/predict";

const staticById = new Map(staticMatches.map((m) => [m.id, m]));

// An upset = the result that happened was rated ≤30% by the AI model.
const UPSET_MAX_PCT = 30;

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

    // Settle any prediction-game picks whose match just finished (idempotent).
    let settledPicks = 0;
    try {
      await ensureGameSchema();
      settledPicks = await settleOpenPicks();
    } catch (e) {
      console.error("Pick settlement error:", e);
    }

    // Send emails by preference.
    const allSubs = await getSubscribers();
    // Tiering: Premium = kickoff + goal + final (real-time);
    //          Free    = final scores only (post-match).
    const premiumSubs = allSubs.filter((s) => s.preferences === "premium");
    const freeSubs = allSubs.filter((s) => s.preferences === "free");

    const kickoffResult = await sendKickoffEmails(premiumSubs, kickoffChanges);
    const goalResult = await sendGoalEmails(premiumSubs, goalChanges.map((g) => g.change));

    // Personalize Final emails: recipients who predicted a just-finished match
    // see their own result (won/lost, points, new rank) above the score cards.
    const picksByEmail = new Map<string, PersonalPick[]>();
    const rankByEmail = new Map<string, DigestRank>();
    try {
      const finalMatchIds = finalChanges.map((c) => c.match_id).filter((id): id is string => !!id);
      if (finalMatchIds.length > 0) {
        const settled = await getSettledPicksForMatches(finalMatchIds);
        for (const sp of settled) {
          const arr = picksByEmail.get(sp.email) ?? [];
          arr.push({ match_id: sp.match_id, pick: sp.pick, status: sp.status, payout: sp.payout });
          picksByEmail.set(sp.email, arr);
        }
        if (picksByEmail.size > 0) {
          const ranked = await getRankedPlayers();
          for (const r of ranked) rankByEmail.set(r.email, { rank: r.rank, points: r.points });
        }
      }
    } catch (e) {
      console.error("Personal Final result lookup error (non-fatal):", e);
    }

    const finalResult = await sendFinalEmails(
      [...premiumSubs, ...freeSubs],
      finalChanges,
      picksByEmail,
      rankByEmail
    );

    // Big Event / Upset alerts — when a just-finished result was rated unlikely by
    // the AI, alert EVERYONE (free + premium) to drive re-engagement. finalChanges
    // fires once per match, so no extra dedupe is needed.
    let bigEventsSent = 0;
    try {
      const everyone = [...premiumSubs, ...freeSubs];
      for (const c of finalChanges) {
        const sm = staticById.get(c.match_id ?? "");
        if (!sm) continue;
        const pred = predictMatch(sm.homeTeam, sm.awayTeam);
        const actualPct =
          c.home_score > c.away_score ? pred.homePct : c.away_score > c.home_score ? pred.awayPct : pred.drawPct;
        if (actualPct > UPSET_MAX_PCT) continue;

        const stats = c.match_id ? await getMatchPickStats(c.match_id) : { total: 0, correct: 0 };
        const playerPct = stats.total >= 5 ? Math.round((stats.correct / stats.total) * 100) : null;
        const event: BigEvent = { change: c, aiPct: actualPct, playerPct };
        const r = await sendBigEventEmails(everyone, event);
        bigEventsSent += r.sent;
      }
    } catch (e) {
      console.error("Big-event alert error (non-fatal):", e);
    }

    const totalSent = kickoffResult.sent + goalResult.sent + finalResult.sent + bigEventsSent;
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
      bigEventsSent,
      settledPicks,
      emailsSent: totalSent,
      emailsFailed: totalFailed,
    });
  } catch (err: any) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
