import { NextResponse } from "next/server";
import { getSubscribers, getRankedPlayers, getSettledPicksForMatches } from "@/lib/db";
import { getTodayMatches } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import {
  sendMatchdayBriefingEmail,
  type DailyPick,
  type RecapResult,
  type PersonalPick,
  type DigestRank,
} from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

// Manual matchday briefing send. Claude drafts recapText/previewText from the
// real results/fixtures each match day, POSTs here with testEmail set to send
// a preview to a single inbox, then POSTs again without testEmail (once the
// human approves) to send the identical content to the full subscriber list.
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (CRON_SECRET && searchParams.get("key") !== CRON_SECRET && bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const recapText: string = typeof body.recapText === "string" ? body.recapText : "";
    const previewText: string = typeof body.previewText === "string" ? body.previewText : "";
    const testEmail: string | undefined = typeof body.testEmail === "string" ? body.testEmail : undefined;
    const hours = Math.max(1, Math.min(48, Number(body.hours) || 18));

    if (!recapText && !previewText) {
      return NextResponse.json({ error: "recapText and/or previewText required" }, { status: 400 });
    }

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

    const ranked = await getRankedPlayers();
    const top = ranked.slice(0, 3).map((r) => ({ name: r.name, points: r.points }));
    const rankByEmail = new Map<string, DigestRank>();
    for (const r of ranked) rankByEmail.set(r.email, { rank: r.rank, points: r.points });

    const settledByEmail = new Map<string, PersonalPick[]>();
    if (results.length > 0) {
      const settled = await getSettledPicksForMatches(results.map((r) => r.match_id));
      for (const sp of settled) {
        const arr = settledByEmail.get(sp.email) ?? [];
        arr.push({ match_id: sp.match_id, pick: sp.pick, status: sp.status, payout: sp.payout });
        settledByEmail.set(sp.email, arr);
      }
    }

    const subs = testEmail
      ? [{ email: testEmail }]
      : (await getSubscribers()).filter((s) => s.preferences !== "bot" && s.preferences !== "npc");

    if (subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: "No recipients" });
    }

    const result = await sendMatchdayBriefingEmail(subs, recapText, previewText, results, picks, top, rankByEmail, settledByEmail);

    return NextResponse.json({
      success: true,
      preview: !!testEmail,
      recipients: subs.length,
      results: results.length,
      picks: picks.length,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("Matchday briefing send error:", err);
    return NextResponse.json({ error: err.message || "Matchday briefing send failed" }, { status: 500 });
  }
}
