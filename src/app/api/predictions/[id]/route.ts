import { NextRequest, NextResponse } from "next/server";
import { getTier } from "@/lib/auth";
import { getMatchByIdWithScore, stageLabel } from "@/lib/data";
import { predictMatch, oddsFromPct } from "@/lib/predict";
import { generateAnalysis } from "@/lib/ai";
import { ensurePredictionsTable, getCachedAnalysis, upsertAnalysis } from "@/lib/db";

// First (uncached) analysis calls a reasoning LLM (~8s) — give the function
// headroom over the 10s default so cold starts don't 504. Cached views instant.
export const maxDuration = 30;

// Prediction numbers + odds are PUBLIC (they're the pick'em game's odds, so
// every player needs them). The AI narrative is the premium edge — gated.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const match = await getMatchByIdWithScore(id);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const p = predictMatch(match.homeTeam, match.awayTeam);
  const prediction = {
    ...p,
    oddsHome: oddsFromPct(p.homePct),
    oddsDraw: oddsFromPct(p.drawPct),
    oddsAway: oddsFromPct(p.awayPct),
  };

  const isPremium = (await getTier()) === "premium";
  let analysis: string | null = null;
  if (isPremium) {
    try {
      await ensurePredictionsTable();
      analysis = await getCachedAnalysis(id);
      if (!analysis) {
        analysis = await generateAnalysis(match.homeTeam, match.awayTeam, stageLabel(match.stage), p);
        if (analysis) await upsertAnalysis(id, analysis);
      }
    } catch (e) {
      console.error("Analysis layer error:", e);
    }
  }

  return NextResponse.json({
    home: match.homeTeam,
    away: match.awayTeam,
    status: match.status,
    prediction,
    analysis,
    analysisLocked: !isPremium,
  });
}
