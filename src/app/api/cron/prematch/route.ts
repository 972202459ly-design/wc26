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

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    // Fetch matches kicking off within the next 20 minutes that haven't had reminders sent
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 20 * 60 * 1000);

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
        toRemind.push({
          home_team: m.home_team,
          away_team: m.away_team,
          utc_date: m.utc_date,
          stage: m.stage,
          group_name: m.group_name,
          match_id: m.match_id,
          api_id: m.api_id,
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

    // Get subscribers — "all" and "daily" get pre-match reminders
    const allSubs = await getSubscribers();
    const reminderSubs = allSubs.filter(
      (s) => s.preferences === "all" || s.preferences === "daily"
    );

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
