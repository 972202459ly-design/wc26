import { NextResponse } from "next/server";
import { ensureTable, upsertMatch, getAllScores, ensureSubscribersTable, getSubscribers } from "@/lib/db";
import type { SyncedMatch } from "@/lib/db";
import { Resend } from "resend";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "WC26 Live <notifications@wc26live.org>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function fetchFromFootballData(): Promise<SyncedMatch[]> {
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/2000/matches?season=2026",
    { headers: { "X-Auth-Token": API_KEY } }
  );

  if (!res.ok) {
    throw new Error(`football-data.org returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const matches: SyncedMatch[] = data.matches.map((m: any) => {
    if (!m.homeTeam || !m.awayTeam) {
      console.warn(`Match ${m.id} missing team:`, JSON.stringify({ homeTeam: m.homeTeam, awayTeam: m.awayTeam }));
    }

    const homeTla = m.homeTeam?.tla || m.homeTeam?.name || "unknown";
    const awayTla = m.awayTeam?.tla || m.awayTeam?.name || "unknown";

    return {
      api_id: m.id,
      match_id: `${homeTla.toLowerCase()}-${awayTla.toLowerCase()}`,
      home_team: m.homeTeam?.name ?? "Unknown",
      away_team: m.awayTeam?.name ?? "Unknown",
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      status: m.status,
      stage: m.stage,
      group_name: m.group,
      utc_date: m.utcDate,
    };
  });

  return matches;
}

function buildEmailHtml(matches: SyncedMatch[], recipientEmail: string): string {
  const unsubscribeUrl = `https://wc26live.org/api/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
  const rows = matches
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #333;font-weight:600">${m.home_team}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #333;text-align:center;font-size:20px;font-weight:700;color:#f0a500">
          ${m.home_score} - ${m.away_score}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #333;font-weight:600;text-align:right">${m.away_team}</td>
      </tr>`
    )
    .join("");

  const label = matches.length === 1 ? "1 match just finished" : `${matches.length} matches just finished`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;color:#fff;font-family:system-ui,sans-serif">
  <div style="max-width:560px;margin:40px auto;padding:0 16px">
    <div style="text-align:center;margin-bottom:32px">
      <h1 style="color:#f0a500;font-size:24px;margin:0">⚽ WC26 Live</h1>
      <p style="color:#888;margin:8px 0 0">2026 FIFA World Cup Results</p>
    </div>
    <div style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #222">
        <p style="margin:0;color:#aaa;font-size:14px">${label}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${rows}
      </table>
    </div>
    <p style="text-align:center;margin-top:24px">
      <a href="https://wc26live.org" style="color:#f0a500;text-decoration:none;font-size:14px">View live standings & schedule →</a>
    </p>
    <p style="text-align:center;color:#555;font-size:12px;margin-top:32px">
      You're receiving this because you subscribed at wc26live.org.<br>
      <a href="${unsubscribeUrl}" style="color:#555">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}

async function sendNotifications(justFinished: SyncedMatch[]): Promise<void> {
  if (justFinished.length === 0) return;

  await ensureSubscribersTable();
  const subscribers = await getSubscribers();
  if (subscribers.length === 0) return;

  const subject =
    justFinished.length === 1
      ? `FT: ${justFinished[0].home_team} ${justFinished[0].home_score}–${justFinished[0].away_score} ${justFinished[0].away_team}`
      : `FT: ${justFinished.length} World Cup results`;

  for (const sub of subscribers) {
    const html = buildEmailHtml(justFinished, sub.email);
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: sub.email,
        subject,
        html,
      });
    } catch (err) {
      console.error(`Failed to send email to ${sub.email}:`, err);
    }
  }

  console.log(`Sent notifications to ${subscribers.length} subscribers for ${justFinished.length} match(es)`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (CRON_SECRET && key !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTable();

    // Snapshot current statuses before syncing
    const existing = await getAllScores();
    const oldStatusMap = new Map(existing.map((m) => [m.api_id, m.status]));

    const matches = await fetchFromFootballData();
    const justFinished: SyncedMatch[] = [];

    for (const m of matches) {
      const oldStatus = oldStatusMap.get(m.api_id);
      await upsertMatch(m);
      if (m.status === "FINISHED" && oldStatus !== "FINISHED") {
        justFinished.push(m);
      }
    }

    // Send email notifications for newly finished matches
    await sendNotifications(justFinished);

    return NextResponse.json({
      success: true,
      updated: matches.length,
      total: matches.length,
      notified: justFinished.length,
    });
  } catch (err: any) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
