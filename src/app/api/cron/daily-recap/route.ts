import { NextResponse } from "next/server";
import { getSubscribers, getRankedPlayers } from "@/lib/db";
import { sendDailyRecapEmail, type RecapResult, type DigestRank } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

// Daily Recap digest — once a day (06:00 UTC via GitHub Actions, after the
// day's slate finishes). Lists matches that wrapped up in the last ~18h with
// final scores, plus a leaderboard snapshot, to pull players back for
// tomorrow's predictions. Sent to all real subscribers (free + premium).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (CRON_SECRET && searchParams.get("key") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    // How far back to look for finished matches (hours); default 18 covers a
    // full day's slate. Override with ?hours=N for testing.
    const hours = Math.max(1, Math.min(48, Number(searchParams.get("hours")) || 18));
    const rows = (await sql`
      SELECT match_id, home_team, away_team, home_score, away_score, stage
      FROM match_scores
      WHERE status = 'FINISHED'
        AND utc_date::timestamptz > now() - make_interval(hours => ${hours})
      ORDER BY utc_date
    `) as unknown as RecapResult[];

    const results: RecapResult[] = rows.filter(
      (r) => r.home_score != null && r.away_score != null
    );

    if (results.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No finished matches in window" });
    }

    const ranked = await getRankedPlayers();
    const top = ranked.slice(0, 3).map((r) => ({ name: r.name, points: r.points }));
    const rankByEmail = new Map<string, DigestRank>();
    for (const r of ranked) rankByEmail.set(r.email, { rank: r.rank, points: r.points });

    // test=<email> sends only to that address (real send) for inbox preview.
    const testEmail = searchParams.get("test");
    const subs = testEmail
      ? [{ email: testEmail }]
      : (await getSubscribers()).filter(
          (s) => s.preferences !== "bot" && s.preferences !== "npc"
        );
    if (subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No subscribers" });
    }

    // Dry run: preview the computed recap without sending anything.
    if (searchParams.get("dry") === "1") {
      return NextResponse.json({
        success: true,
        dryRun: true,
        subscribers: subs.length,
        top,
        results: results.map((r) => `${r.home_team} ${r.home_score}-${r.away_score} ${r.away_team}`),
      });
    }

    const result = await sendDailyRecapEmail(subs, results, top, rankByEmail);

    return NextResponse.json({
      success: true,
      matches: results.length,
      subscribers: subs.length,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("Daily recap cron error:", err);
    return NextResponse.json({ error: err.message || "Daily recap cron failed" }, { status: 500 });
  }
}
