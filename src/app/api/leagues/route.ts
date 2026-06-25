import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createLeague, getUserLeagues, LEAGUE_TIERS, type LeagueTier } from "@/lib/leagues";

// GET: leagues the signed-in player owns or has joined.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const leagues = await getUserLeagues(session.email);
  return NextResponse.json({ leagues });
}

// POST: create a draft (unpaid) league. The client then opens the Paddle
// checkout for the matching tier; the webhook flips it to paid. We return the
// price id so the client doesn't have to know the tier→env mapping.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: { name?: string; tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  if (name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: "League name must be 2–40 characters" }, { status: 400 });
  }
  const tier: LeagueTier = body.tier === "host100" ? "host100" : "host30";

  const league = await createLeague(session.email, name, tier);
  const priceId = process.env[LEAGUE_TIERS[tier].envKey] || "";

  return NextResponse.json({
    league: { id: league.id, code: league.code, name: league.name, tier: league.tier, paid: league.paid },
    priceId,
  });
}
