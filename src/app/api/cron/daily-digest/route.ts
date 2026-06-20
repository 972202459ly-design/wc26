import { NextResponse } from "next/server";
import { getSubscribers, getRankedPlayers, getSettledPicksForMatches } from "@/lib/db";
import { getTodayMatches } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import {
  sendDailyDigestEmail,
  type DailyPick,
  type RecapResult,
  type PersonalPick,
  type DigestRank,
} from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

// Unified Daily Digest — one email a day (13:00 UTC via GitHub Actions) to all
// real subscribers: the last day's results (with each player's own outcomes),
// today's not-yet-started matches with AI picks, and the leaderboard. Replaces
// the separate Daily Picks / Daily Recap / per-match Final / Big-Event sends so
// total volume stays inside Resend's free tier (~one send per user per day).
// Supports ?dry=1 (preview), ?test=<email> (single real send), ?hours=N (recap
// look-back window).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (CRON_SECRET && searchParams.get("key") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    const now = Date.now();

    const scoreRows = (await sql`
      SELECT match_id, home_team, away_team, home_score, away_score, status, utc_date, stage
      FROM match_scores
    `) as unknown as {
      match_id: string; home_team: string; away_team: string;
      home_score: number | null; away_score: number | null;
      status: string; utc_date: string; stage: string | null;
    }[];
    const scoreMap = new Map(scoreRows.map((r) => [r.match_id, r]));

    // Recap: matches finished within the look-back window (default 18h).
    const hours = Math.max(1, Math.min(48, Number(searchParams.get("hours")) || 18));
    const cutoff = now - hours * 3600 * 1000;
    const results: RecapResult[] = scoreRows
      .filter(
        (r) =>
          r.status === "FINISHED" &&
          r.home_score != null &&
          r.away_score != null &&
          new Date(r.utc_date).getTime() > cutoff
      )
      .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime())
      .map((r) => ({
        home_team: r.home_team,
        away_team: r.away_team,
        home_score: r.home_score!,
        away_score: r.away_score!,
        match_id: r.match_id,
        stage: r.stage,
      }));

    // Picks: today's matches not yet kicked off.
    const picks: DailyPick[] = getTodayMatches()
      .map((m) => {
        const synced = scoreMap.get(m.id);
        const utc = synced?.utc_date ?? `${m.date}T${m.time}:00Z`;
        return { m, utc, status: synced?.status };
      })
      .filter(({ utc, status }) => new Date(utc).getTime() > now && status !== "FINISHED" && status !== "IN_PLAY")
      .sort((a, b) => new Date(a.utc).getTime() - new Date(b.utc).getTime())
      .map(({ m, utc }) => {
        const pr = predictMatch(m.homeTeam, m.awayTeam);
        const favorite = pr.pick === "home" ? m.homeTeam : pr.pick === "away" ? m.awayTeam : "Draw";
        const favoritePct = pr.pick === "home" ? pr.homePct : pr.pick === "away" ? pr.awayPct : pr.drawPct;
        return {
          home_team: m.homeTeam, away_team: m.awayTeam, match_id: m.id,
          utc_date: utc, stage: m.stage, favorite, favoritePct,
        };
      });

    if (results.length === 0 && picks.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "Nothing to report today" });
    }

    const ranked = await getRankedPlayers();
    const top = ranked.slice(0, 3).map((r) => ({ name: r.name, points: r.points }));
    const rankByEmail = new Map<string, DigestRank>();
    for (const r of ranked) rankByEmail.set(r.email, { rank: r.rank, points: r.points });

    // Per-recipient settled picks on the recap matches (personal results).
    const settledByEmail = new Map<string, PersonalPick[]>();
    if (results.length > 0) {
      const settled = await getSettledPicksForMatches(results.map((r) => r.match_id));
      for (const sp of settled) {
        const arr = settledByEmail.get(sp.email) ?? [];
        arr.push({ match_id: sp.match_id, pick: sp.pick, status: sp.status, payout: sp.payout });
        settledByEmail.set(sp.email, arr);
      }
    }

    const testEmail = searchParams.get("test");
    const subs = testEmail
      ? [{ email: testEmail }]
      : (await getSubscribers()).filter((s) => s.preferences !== "bot" && s.preferences !== "npc");
    if (subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No subscribers" });
    }

    if (searchParams.get("dry") === "1") {
      return NextResponse.json({
        success: true,
        dryRun: true,
        subscribers: subs.length,
        results: results.map((r) => `${r.home_team} ${r.home_score}-${r.away_score} ${r.away_team}`),
        picks: picks.map((p) => `${p.home_team} vs ${p.away_team} — ${p.favorite} ${p.favoritePct}%`),
        top,
      });
    }

    const result = await sendDailyDigestEmail(subs, results, picks, top, rankByEmail, settledByEmail);
    return NextResponse.json({
      success: true,
      results: results.length,
      picks: picks.length,
      subscribers: subs.length,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("Daily digest cron error:", err);
    return NextResponse.json({ error: err.message || "Daily digest cron failed" }, { status: 500 });
  }
}
