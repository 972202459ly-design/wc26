import { NextRequest, NextResponse } from "next/server";
import { getMatchById, stageLabel } from "@/lib/data";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = getMatchById(id);
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
  const teaser = full ? full.split(/(?<=[.!?])\s/)[0] : null;

  return NextResponse.json({
    teaser,
    full: isPremium ? full : null,
    locked: !isPremium && !!full,
  });
}
