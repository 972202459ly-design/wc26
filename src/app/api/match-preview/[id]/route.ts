import { NextRequest, NextResponse } from "next/server";
import { getMatchByIdWithScore, stageLabel } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { generateAnalysis } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import {
  ensurePredictionsTable,
  getCachedAnalysis,
  upsertAnalysis,
  getTierByEmail,
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function fallbackPreview(home: string, away: string, pred: ReturnType<typeof predictMatch>): string {
  const favorite =
    pred.homePct >= pred.awayPct
      ? { team: home, pct: pred.homePct }
      : { team: away, pct: pred.awayPct };
  const close = Math.abs(pred.homePct - pred.awayPct) <= 6;

  if (close) {
    return `${home} vs ${away} looks tight before kickoff, with the model showing only a small gap between the top outcomes. Watch the opening tempo, midfield control, and which side creates the first clear chance.`;
  }

  return `${favorite.team} has the pre-match edge at ${favorite.pct}%, but ${home} vs ${away} still depends on the early tempo and key attacking moments. Watch the first 20 minutes for pressing, transitions, and set-piece danger.`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = await getMatchByIdWithScore(id);
  if (!match) {
    return NextResponse.json({ teaser: null, full: null, locked: false });
  }

  const { homeTeam: home, awayTeam: away, stage } = match;
  const pred = predictMatch(home, away);

  let full: string | null = null;
  try {
    await ensurePredictionsTable();
    full = await getCachedAnalysis(id);
    if (!full) {
      full = await generateAnalysis(home, away, stageLabel(stage), pred);
      if (full) await upsertAnalysis(id, full);
    }
  } catch (e) {
    console.error("match-preview error:", e);
  }

  // Full AI breakdown is a Pro perk; everyone sees the teaser.
  const session = await getSession();
  const isPremium = session ? (await getTierByEmail(session.email)) === "premium" : false;
  const teaser = full ? full.split(/(?<=[.!?])\s/)[0] : fallbackPreview(home, away, pred);

  return NextResponse.json(
    {
      teaser,
      full: isPremium ? full : null,
      locked: !isPremium && !!full,
    },
    // Anonymous visitors (the vast majority) all get the identical
    // teaser-only response, so it's safe to let the CDN serve it for a
    // minute instead of invoking this function — and re-running the AI
    // generation — on every request. Logged-in requests are never cached:
    // their response depends on session/tier and must stay per-request.
    session
      ? { headers: { Vary: "Cookie" } }
      : {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            Vary: "Cookie",
          },
        }
  );
}
