import type { Prediction } from "./predict";

export type AdvanceSide = "home" | "away";

export function roundMultiplier(stage: string | null | undefined): number {
  switch (stage) {
    case "LAST_16":
    case "ROUND_OF_16":
      return 2;
    case "QUARTER_FINALS":
      return 4;
    case "SEMI_FINALS":
      return 8;
    case "FINAL":
      return 16;
    default:
      return 1;
  }
}

export function advanceProbabilities(pred: Prediction): { home: number; away: number } {
  const home = pred.homePct + Math.round(pred.drawPct / 2);
  return { home, away: 100 - home };
}

export function pickReward(probability: number, stage: string | null | undefined): number {
  const base = probability >= 55 ? 100 : probability >= 40 ? 150 : 250;
  return base * roundMultiplier(stage);
}

export function pickTag(probability: number): "Favorite" | "Toss-up" | "Upset" {
  if (probability >= 55) return "Favorite";
  if (probability >= 40) return "Toss-up";
  return "Upset";
}

export function aiAdvancePick(pred: Prediction): AdvanceSide {
  const probs = advanceProbabilities(pred);
  return probs.home >= probs.away ? "home" : "away";
}
