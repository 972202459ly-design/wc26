import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMatchByIdWithScore } from "@/lib/data";
import { predictMatch, oddsFromPct } from "@/lib/predict";
import {
  ensureGameSchema,
  placePick,
  getUserPicks,
  getOrCreatePlayer,
  dailyTopup,
} from "@/lib/db";

// GET: current player's balance + pick history (also grants the daily top-up).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  await ensureGameSchema();
  const points = await dailyTopup(session.email);
  const player = await getOrCreatePlayer(session.email);
  const picks = await getUserPicks(session.email);

  return NextResponse.json({
    email: session.email,
    username: player.username,
    tier: player.tier,
    points,
    picks,
  });
}

// POST: place (or replace, before kickoff) a stake on a match outcome. Odds are
// computed server-side from our model — never trusted from the client.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: { matchId?: string; pick?: string; stake?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { matchId, pick } = body;
  const stake = Math.floor(Number(body.stake));

  if (!matchId || (pick !== "home" && pick !== "draw" && pick !== "away")) {
    return NextResponse.json({ error: "Invalid pick" }, { status: 400 });
  }
  if (!Number.isFinite(stake) || stake < 10) {
    return NextResponse.json({ error: "Minimum 10 points per prediction" }, { status: 400 });
  }

  const match = await getMatchByIdWithScore(matchId);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "upcoming") {
    return NextResponse.json({ error: "Predictions are locked — the match has started" }, { status: 400 });
  }

  await ensureGameSchema();
  const prediction = predictMatch(match.homeTeam, match.awayTeam);
  const pct = pick === "home" ? prediction.homePct : pick === "draw" ? prediction.drawPct : prediction.awayPct;
  const odds = oddsFromPct(pct);

  const result = await placePick(session.email, matchId, pick, stake, odds);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, points: result.points, pick, stake, odds });
}
