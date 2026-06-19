import { NextResponse } from "next/server";
import {
  ensureTable,
  ensureSubscribersTable,
  ensurePrematchRemindersTable,
  getSubscribers,
  isReminderSent,
  markReminderSent,
} from "@/lib/db";
import type { SyncedMatch } from "@/lib/db";
import { sendPrematchEmails, type UpcomingMatch } from "@/lib/email";
import { matches as staticMatches } from "@/lib/data";
import { predictMatch } from "@/lib/predict";

const staticById = new Map(staticMatches.map((m) => [m.id, m]));

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
    await ensurePrematchRemindersTable();

    // test=<email>: preview the Match Reminder (with AI win prob) for the next
    // upcoming matches, sent only to that address.
    const testEmail = searchParams.get("test");
    if (testEmail) {
      const nowMs = Date.now();
      const sample: UpcomingMatch[] = staticMatches
        .filter((m) => new Date(`${m.date}T${m.time}`).getTime() > nowMs)
        .slice(0, 2)
        .map((m) => {
          const pred = predictMatch(m.homeTeam, m.awayTeam);
          return {
            home_team: m.homeTeam, away_team: m.awayTeam, utc_date: `${m.date}T${m.time}:00Z`,
            stage: m.stage, group_name: null, match_id: m.id, api_id: 0,
            homePct: pred.homePct, drawPct: pred.drawPct, awayPct: pred.awayPct,
          };
        });
      const r = await sendPrematchEmails([{ email: testEmail }], sample);
      return NextResponse.json({ success: true, test: true, matches: sample.length, sent: r.sent, failed: r.failed });
    }

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    // Fetch matches kicking off within the next 15 minutes that haven't had reminders sent
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    const upcomingRows = await sql`
      SELECT * FROM match_scores
      WHERE status = 'TIMED'
        AND utc_date > ${now.toISOString()}
        AND utc_date <= ${windowEnd.toISOString()}
      ORDER BY utc_date ASC
    `;

    const upcoming = upcomingRows as unknown as SyncedMatch[];

    // Filter out matches that already had reminders sent
    const toRemind: UpcomingMatch[] = [];
    for (const m of upcoming) {
      const alreadySent = await isReminderSent(m.api_id);
      if (!alreadySent) {
        // Attach AI win probabilities using canonical static team names.
        const sm = staticById.get(m.match_id);
        const pred = sm ? predictMatch(sm.homeTeam, sm.awayTeam) : null;
        toRemind.push({
          home_team: m.home_team,
          away_team: m.away_team,
          utc_date: m.utc_date,
          stage: m.stage,
          group_name: m.group_name,
          match_id: m.match_id,
          api_id: m.api_id,
          homePct: pred?.homePct,
          drawPct: pred?.drawPct,
          awayPct: pred?.awayPct,
        });
      }
    }

    if (toRemind.length === 0) {
      return NextResponse.json({
        success: true,
        reminded: 0,
        reason: "No upcoming matches in the 20-minute window needing reminders",
      });
    }

    // Pre-match (kickoff) reminders are a Premium feature.
    const allSubs = await getSubscribers();
    const reminderSubs = allSubs.filter((s) => s.preferences === "premium");

    if (reminderSubs.length === 0) {
      return NextResponse.json({
        success: true,
        reminded: 0,
        reason: "No subscribers with all/daily preferences",
        matches: toRemind.map((m) => m.match_id),
      });
    }

    const result = await sendPrematchEmails(reminderSubs, toRemind);

    // Mark reminders as sent
    for (const m of toRemind) {
      await markReminderSent(m.api_id);
    }

    return NextResponse.json({
      success: true,
      reminded: toRemind.length,
      emailsSent: result.sent,
      emailsFailed: result.failed,
      matches: toRemind.map((m) => m.match_id),
      subscribers: reminderSubs.length,
    });
  } catch (err: any) {
    console.error("Prematch cron error:", err);
    return NextResponse.json(
      { error: err.message || "Prematch cron failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
