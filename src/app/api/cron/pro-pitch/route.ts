import { NextResponse } from "next/server";
import { getRankedPlayers } from "@/lib/db";
import { sendProPitchEmail, type DigestRank, type NextMatchInfo } from "@/lib/email";
import { matches as staticMatches } from "@/lib/data";
import { predictMatch } from "@/lib/predict";

const CRON_SECRET = process.env.CRON_SECRET;
const LIVE_OR_DONE = new Set(["IN_PLAY", "PAUSED", "LIVE", "FINISHED"]);

export const dynamic = "force-dynamic";

// Pro upgrade pitch to ENGAGED free players — those who have placed at least
// one pick (they value the game, so they're the realistic converters). Shows
// their rank, the next match, and the Fan Pro value. Guarded by
// CRON_SECRET; supports ?dry=1 and ?test=<email>. Triggered manually.
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

    // Soonest upcoming match + its AI prediction (for the "Pro sees the call" hook).
    const scoreRows = (await sql`SELECT match_id, status, utc_date FROM match_scores`) as unknown as {
      match_id: string; status: string; utc_date: string;
    }[];
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
          home: sm.homeTeam, away: sm.awayTeam, utc_date: upcoming.utc_date,
          match_id: upcoming.match_id, stage: sm.stage, favorite, favoritePct,
        };
      }
    }

    // Recipients: free players (not premium, not bots) who have ≥1 pick.
    const testEmail = searchParams.get("test");
    let subs: { email: string }[];
    if (testEmail) {
      subs = [{ email: testEmail }];
    } else {
      subs = (await sql`
        SELECT DISTINCT s.email
        FROM subscribers s
        JOIN picks p ON p.email = s.email
        WHERE s.preferences = 'free'
      `) as unknown as { email: string }[];
    }
    if (subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No engaged free players" });
    }

    if (searchParams.get("dry") === "1") {
      return NextResponse.json({
        success: true,
        dryRun: true,
        recipients: subs.length,
        emails: subs.map((s) => s.email),
        nextMatch: nextMatch ? `${nextMatch.home} vs ${nextMatch.away}` : null,
        top,
      });
    }

    const result = await sendProPitchEmail(subs, top, rankByEmail, nextMatch);
    return NextResponse.json({ success: true, recipients: subs.length, sent: result.sent, failed: result.failed });
  } catch (err: any) {
    console.error("Pro-pitch error:", err);
    return NextResponse.json({ error: err.message || "Pro-pitch failed" }, { status: 500 });
  }
}
