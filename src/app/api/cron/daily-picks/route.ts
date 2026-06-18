import { NextResponse } from "next/server";
import { getSubscribers, getRankedPlayers } from "@/lib/db";
import { getTodayMatches } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { sendDailyPicksEmail, type DailyPick, type DigestRank } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

// Daily Picks digest — once a day (13:00 UTC via GitHub Actions). Lists today's
// not-yet-started matches with the AI pick, plus a personalized leaderboard
// snapshot, to pull players back to /predict. Sent to all real subscribers.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (CRON_SECRET && searchParams.get("key") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();

    // Authoritative UTC kickoff times keyed by match_id (from synced scores).
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    const scoreRows = (await sql`
      SELECT match_id, utc_date, status FROM match_scores
    `) as unknown as { match_id: string; utc_date: string; status: string }[];
    const scoreMap = new Map(scoreRows.map((r) => [r.match_id, r]));

    // Canonical team names come from static data (matches the prediction model);
    // kickoff/upcoming status comes from synced scores where available.
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
          home_team: m.homeTeam,
          away_team: m.awayTeam,
          match_id: m.id,
          utc_date: utc,
          stage: m.stage,
          favorite,
          favoritePct,
        };
      });

    if (picks.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No upcoming matches today" });
    }

    const ranked = await getRankedPlayers();
    const top = ranked.slice(0, 3).map((r) => ({ name: r.name, points: r.points }));
    const rankByEmail = new Map<string, DigestRank>();
    for (const r of ranked) rankByEmail.set(r.email, { rank: r.rank, points: r.points });

    // test=<email> sends only to that address (real send) for inbox preview.
    const testEmail = searchParams.get("test");
    const subs = testEmail
      ? [{ email: testEmail, preferences: "premium" }]
      : (await getSubscribers()).filter(
          (s) => s.preferences === "free" || s.preferences === "premium"
        );
    if (subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No subscribers" });
    }

    // Dry run: preview the computed digest without sending anything.
    if (searchParams.get("dry") === "1") {
      return NextResponse.json({
        success: true,
        dryRun: true,
        subscribers: subs.length,
        top,
        picks: picks.map((p) => `${p.home_team} vs ${p.away_team} — ${p.favorite} ${p.favoritePct}%`),
      });
    }

    const result = await sendDailyPicksEmail(subs, picks, top, rankByEmail);

    return NextResponse.json({
      success: true,
      matches: picks.length,
      subscribers: subs.length,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("Daily picks cron error:", err);
    return NextResponse.json({ error: err.message || "Daily picks cron failed" }, { status: 500 });
  }
}
