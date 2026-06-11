import { NextResponse } from "next/server";
import { ensureTable, upsertMatch } from "@/lib/db";
import type { SyncedMatch } from "@/lib/db";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

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
    // Safety check for null teams
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

export async function GET(request: Request) {
  // Require secret key for sync trigger
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (CRON_SECRET && key !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTable();

    const matches = await fetchFromFootballData();
    let updated = 0;
    for (const m of matches) {
      await upsertMatch(m);
      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      total: matches.length,
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
