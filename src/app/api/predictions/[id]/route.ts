import { NextRequest, NextResponse } from "next/server";
import { getTier } from "@/lib/auth";
import { getMatchByIdWithScore, stageLabel } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { generateAnalysis } from "@/lib/ai";
import { ensurePredictionsTable, getCachedAnalysis, upsertAnalysis } from "@/lib/db";

// First (uncached) generation calls a reasoning LLM (~8s) — give the function
// headroom over the 10s default so cold starts don't 504. Cached views are instant.
export const maxDuration = 30;

// Premium-gated prediction endpoint. Free visitors get 403 and never receive
// the numbers (the paywall is enforced here, not just in the UI). The win %
// is computed live/deterministically; the AI narrative is cached per match.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if ((await getTier()) !== "premium") {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  const match = await getMatchByIdWithScore(id);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const prediction = predictMatch(match.homeTeam, match.awayTeam);

  let analysis: string | null = null;
  try {
    await ensurePredictionsTable();
    analysis = await getCachedAnalysis(id);
    if (!analysis) {
      analysis = await generateAnalysis(
        match.homeTeam,
        match.awayTeam,
        stageLabel(match.stage),
        prediction
      );
      if (analysis) await upsertAnalysis(id, analysis);
    }
  } catch (e) {
    // Numbers still return even if the narrative layer fails.
    console.error("Analysis layer error:", e);
  }

  return NextResponse.json({
    home: match.homeTeam,
    away: match.awayTeam,
    prediction,
    analysis,
  });
}
