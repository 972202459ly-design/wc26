import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMatchByIdWithScore } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { advanceProbabilities, pickReward } from "@/lib/pickem";
import { ensureGameSchema, getUserPicks, placeAdvancePick, dailyTopup, getOrCreatePlayer } from "@/lib/db";
import { recordEvent } from "@/lib/events";

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
    picks: picks.filter((p: any) => p.pick_kind === "advance" || p.stake === 0),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: { matchId?: string; pick?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.matchId || (body.pick !== "home" && body.pick !== "away")) {
    return NextResponse.json({ error: "Invalid pick" }, { status: 400 });
  }

  const match = await getMatchByIdWithScore(body.matchId);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "upcoming") {
    return NextResponse.json({ error: "Picks are locked for this match" }, { status: 400 });
  }

  await ensureGameSchema();
  const pred = predictMatch(match.homeTeam, match.awayTeam);
  const probs = advanceProbabilities(pred);
  const reward = pickReward(body.pick === "home" ? probs.home : probs.away, match.stage);
  const result = await placeAdvancePick(session.email, body.matchId, body.pick, reward);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  recordEvent("advance_pick", {
    source: "predict",
    email: session.email,
    props: { matchId: body.matchId, pick: body.pick, reward },
  });

  return NextResponse.json({ ok: true, points: result.points, pick: body.pick, reward });
}
