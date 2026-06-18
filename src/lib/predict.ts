import { getRating } from "./ratings";

// ─── Statistical match prediction (deterministic, zero-cost) ──────────
// Ratings → goal-supremacy → independent Poisson goal distributions for each
// team → aggregate the scoreline grid into win/draw/loss probabilities. The
// numbers are reproducible (no LLM), which is exactly what the qualification
// simulator needs to reuse later.

const GOAL_BASE = 1.33; // per-team baseline (~2.66 goals/match, WC average)
const SUP_DIVISOR = 150; // rating points per goal of supremacy
const SUP_CAP = 2.4; // clamp blowouts to keep the model sane
const GRID = 9; // max goals per team considered

export interface Prediction {
  homePct: number; // win probability %, integers summing to 100
  drawPct: number;
  awayPct: number;
  lambdaHome: number; // expected goals
  lambdaAway: number;
  topHome: number; // most likely scoreline
  topAway: number;
  pick: "home" | "draw" | "away";
}

/** Fair decimal odds from a win-probability percentage (no house margin). */
export function oddsFromPct(pct: number): number {
  const p = Math.max(1, pct);
  return Math.max(1.05, Math.round((100 / p) * 100) / 100);
}

function poisson(k: number, lambda: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

export function expectedGoals(home: string, away: string): [number, number] {
  const diff = getRating(home) - getRating(away);
  const sup = Math.max(-SUP_CAP, Math.min(SUP_CAP, diff / SUP_DIVISOR));
  const lh = Math.max(0.18, GOAL_BASE + sup / 2);
  const la = Math.max(0.18, GOAL_BASE - sup / 2);
  return [lh, la];
}

export function predictMatch(home: string, away: string): Prediction {
  const [lh, la] = expectedGoals(home, away);

  const ph = Array.from({ length: GRID + 1 }, (_, k) => poisson(k, lh));
  const pa = Array.from({ length: GRID + 1 }, (_, k) => poisson(k, la));

  let pHome = 0,
    pDraw = 0,
    pAway = 0,
    best = -1,
    topHome = 0,
    topAway = 0,
    total = 0;

  for (let h = 0; h <= GRID; h++) {
    for (let a = 0; a <= GRID; a++) {
      const p = ph[h] * pa[a];
      total += p;
      if (h > a) pHome += p;
      else if (h === a) pDraw += p;
      else pAway += p;
      if (p > best) {
        best = p;
        topHome = h;
        topAway = a;
      }
    }
  }

  // Normalize for grid truncation, then convert to integer percents that sum
  // to exactly 100 (largest-remainder rounding).
  const raw = [pHome / total, pDraw / total, pAway / total];
  const floors = raw.map((x) => Math.floor(x * 100));
  let remainder = 100 - floors.reduce((s, x) => s + x, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x * 100 - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const pct = [...floors];
  for (let j = 0; j < remainder; j++) pct[order[j].i]++;

  const pickIdx = pct.indexOf(Math.max(...pct));
  const pick = pickIdx === 0 ? "home" : pickIdx === 1 ? "draw" : "away";

  return {
    homePct: pct[0],
    drawPct: pct[1],
    awayPct: pct[2],
    lambdaHome: Math.round(lh * 10) / 10,
    lambdaAway: Math.round(la * 10) / 10,
    topHome,
    topAway,
    pick,
  };
}
