import { NextResponse } from "next/server";
import {
  ensureTable,
  ensureSubscribersTable,
  ensureGameSchema,
  settleOpenPicks,
  upsertMatches,
  getAllScores,
  getSubscribers,
  getSettledPicksForMatches,
  getRankedPlayers,
} from "@/lib/db";
import type { SyncedMatch } from "@/lib/db";
import {
  sendKickoffEmails,
  sendGoalEmails,
  sendFinalEmails,
  type ScoreChange,
  type PersonalPick,
  type DigestRank,
} from "@/lib/email";
import { getWorldCupFixtures, getGoalEvents } from "@/lib/apifootball";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (CRON_SECRET && key !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch fixtures FIRST (external API — no DB). This lets us decide whether
    // any DB work is needed before waking the Neon branch.
    const fixtures = await getWorldCupFixtures();
    const matches: SyncedMatch[] = fixtures.map((f) => f.synced);

    // ─── Compute gate ───────────────────────────────────────────────────
    // Only touch the database when a match is in its active window (about to
    // kick off, in play, or recently finished — long enough to record the
    // final score and settle picks). Outside that window we return without a
    // single DB query, so the Neon branch can auto-suspend and burn ~0 compute
    // on rest days and dead hours. This is the main compute saver.
    const now = Date.now();
    const WINDOW_BEFORE = 20 * 60 * 1000; // 20 min before kickoff
    const WINDOW_AFTER = 3 * 60 * 60 * 1000; // 3 h after kickoff (play + settle)
    const anyActive = matches.some((m) => {
      if (m.status === "IN_PLAY" || m.status === "PAUSED") return true;
      const ko = new Date(m.utc_date).getTime();
      if (Number.isNaN(ko)) return false;
      return now >= ko - WINDOW_BEFORE && now <= ko + WINDOW_AFTER;
    });
    // force=1 bypasses the gate for manual catch-ups: bracket progressions
    // (next round's matchups) land on API-Football BETWEEN live windows, so a
    // round that ends right at a sync can leave the following round unsynced
    // until the next kickoff. Status transitions still drive emails, so a
    // forced run outside a window sends nothing.
    const force = searchParams.get("force") === "1";
    if (!anyActive && !force) {
      return NextResponse.json({
        success: true,
        skipped: "no active matches — db untouched",
        total: matches.length,
      });
    }

    let dbAvailable = true;
    try {
      await ensureTable();
      await ensureSubscribersTable();
    } catch (err) {
      dbAvailable = false;
      console.error("Sync DB unavailable; serving API-Football without persistence:", err);
    }

    if (!dbAvailable) {
      const liveCount = matches.filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED").length;
      return NextResponse.json({
        success: true,
        source: "api-football",
        persistence: "disabled-db-unavailable",
        updated: 0,
        total: matches.length,
        live: liveCount,
      });
    }

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

    // Upsert all matches in a single round trip.
    const updated = await upsertMatches(matches);

    // Settle any prediction-game picks whose match just finished (idempotent).
    let settledPicks = 0;
    try {
      await ensureGameSchema();
      settledPicks = await settleOpenPicks();
    } catch (e) {
      console.error("Pick settlement error:", e);
    }

    // Send emails by preference. Premium = real-time (kickoff/goal/final);
    // free subscribers get everything once a day via the unified Daily Digest.
    const allSubs = await getSubscribers();
    const premiumSubs = allSubs.filter((s) => s.preferences === "premium");

    // Real-time emails go to PREMIUM only (kickoff / goal / per-match final with
    // the player's own result). Free subscribers get everything once a day via
    // the unified Daily Digest instead — this keeps total volume inside Resend's
    // free tier (per-match Final-to-everyone + Big-Event broadcasts were what
    // blew the daily quota).
    const kickoffResult = await sendKickoffEmails(premiumSubs, kickoffChanges);
    const goalResult = await sendGoalEmails(premiumSubs, goalChanges.map((g) => g.change));

    // Personalize the premium Final: recipients who predicted a just-finished
    // match see their own result (won/lost, points, rank) above the score cards.
    const picksByEmail = new Map<string, PersonalPick[]>();
    const rankByEmail = new Map<string, DigestRank>();
    try {
      const finalMatchIds = finalChanges.map((c) => c.match_id).filter((id): id is string => !!id);
      if (premiumSubs.length > 0 && finalMatchIds.length > 0) {
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

    const finalResult = await sendFinalEmails(premiumSubs, finalChanges, picksByEmail, rankByEmail);

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
