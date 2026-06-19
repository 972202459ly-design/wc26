import { NextResponse } from "next/server";
import { getRankedPlayers } from "@/lib/db";
import { sendInvitePredictEmail, type DigestRank } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

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
        sampleRanks: subs.slice(0, 5).map((s) => ({
          email: s.email,
          rank: rankByEmail.get(s.email)?.rank ?? null,
        })),
      });
    }

    const result = await sendInvitePredictEmail(subs, top, rankByEmail);
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
