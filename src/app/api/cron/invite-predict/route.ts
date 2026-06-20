import { NextResponse } from "next/server";
import { getRankedPlayers } from "@/lib/db";
import { sendInvitePredictEmail, type DigestRank, type NextMatchInfo } from "@/lib/email";
import { matches as staticMatches } from "@/lib/data";
import { predictMatch } from "@/lib/predict";

const CRON_SECRET = process.env.CRON_SECRET;
const LIVE_OR_DONE = new Set(["IN_PLAY", "PAUSED", "LIVE", "FINISHED"]);

export const dynamic = "force-dynamic";

// Re-engagement blast: nudge registered players who have never made a
// prediction to join the game. They sit at their 1000-point starting score on
// the leaderboard; this email shows their rank + the top players and a CTA to
// make a first prediction. Guarded by CRON_SECRET; supports ?dry=1 and
// ?test=<email>. Not on a schedule — triggered manually / via workflow_dispatch.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (CRON_SECRET && searchParams.get("key") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    const ranked = await getRankedPlayers();
    const top = ranked.slice(0, 3).map((r) => ({ name: r.name, points: r.points }));
    const rankByEmail = new Map<string, DigestRank>();
    for (const r of ranked) rankByEmail.set(r.email, { rank: r.rank, points: r.points });

    // Soonest upcoming match (not started/finished) + its AI prediction.
    const scoreRows = (await sql`
      SELECT match_id, status, utc_date FROM match_scores
    `) as unknown as { match_id: string; status: string; utc_date: string }[];
    const nowMs = Date.now();
    const upcoming = scoreRows
      .filter((r) => !LIVE_OR_DONE.has(r.status) && new Date(r.utc_date).getTime() > nowMs)
      .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime())[0];
    let nextMatch: NextMatchInfo | null = null;
    if (upcoming) {
      const sm = staticMatches.find((s) => s.id === upcoming.match_id);
      if (sm) {
        const pr = predictMatch(sm.homeTeam, sm.awayTeam);
        const favorite = pr.pick === "home" ? sm.homeTeam : pr.pick === "away" ? sm.awayTeam : "Draw";
        const favoritePct = pr.pick === "home" ? pr.homePct : pr.pick === "away" ? pr.awayPct : pr.drawPct;
        nextMatch = {
          home: sm.homeTeam,
          away: sm.awayTeam,
          utc_date: upcoming.utc_date,
          match_id: upcoming.match_id,
          stage: sm.stage,
          favorite,
          favoritePct,
        };
      }
    }

    // Recipients: real subscribers (no bots) who have never placed a pick.
    const testEmail = searchParams.get("test");
    let subs: { email: string }[];
    if (testEmail) {
      subs = [{ email: testEmail }];
    } else {
      const rows = (await sql`
        SELECT email FROM subscribers
        WHERE preferences NOT IN ('bot', 'npc')
          AND email NOT IN (SELECT DISTINCT email FROM picks)
        ORDER BY created_at ASC
      `) as unknown as { email: string }[];
      subs = rows;
    }
    if (subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No inactive subscribers" });
    }

    if (searchParams.get("dry") === "1") {
      return NextResponse.json({
        success: true,
        dryRun: true,
        recipients: subs.length,
        top,
        nextMatch: nextMatch
          ? `${nextMatch.home} vs ${nextMatch.away} — AI: ${nextMatch.favorite} ${nextMatch.favoritePct}% (${nextMatch.utc_date})`
          : null,
        sampleRanks: subs.slice(0, 5).map((s) => ({
          email: s.email,
          rank: rankByEmail.get(s.email)?.rank ?? null,
        })),
      });
    }

    const result = await sendInvitePredictEmail(subs, top, rankByEmail, nextMatch);
    return NextResponse.json({
      success: true,
      recipients: subs.length,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("Invite-predict error:", err);
    return NextResponse.json({ error: err.message || "Invite-predict failed" }, { status: 500 });
  }
}
