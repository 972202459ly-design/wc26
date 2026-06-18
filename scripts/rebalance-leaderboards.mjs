import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL env var is required. Run: DATABASE_URL=... node scripts/rebalance-leaderboards.mjs");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// 1. Individual leaderboard — tighter, catchable spread (1080–1620). France &
//    Portugal at the top; Argentina no longer a runaway leader.
const points = {
  xGWizard: 1620, FinalWhistle: 1585, GoalMachine: 1560, PredictorX: 1520,
  TacticalFan: 1470, MatchAnalyst: 1420, BallTracker: 1370, OffsideTrap: 1320,
  DeadballKing: 1265, SweepstakePro: 1205, SetPieceGuru: 1140, CounterPress: 1080,
};
console.log("Individual board:");
for (const [name, pts] of Object.entries(points)) {
  await sql`UPDATE subscribers SET points = ${pts} WHERE username = ${name} AND preferences = 'npc'`;
  console.log(`  ${name} -> ${pts}`);
}

// 2. Team leaderboard — rescale each team's bot/npc won-pick payouts to a
//    balanced band (was arg 16140 → jpn 1818; now ~9600 → ~5700).
const targets = {
  fra: 9600, arg: 9300, por: 9100, bra: 8900, eng: 8500, esp: 8100,
  ger: 7700, ned: 7300, usa: 6900, mex: 6500, mar: 6100, jpn: 5700,
};
console.log("Team board:");
for (const [team, target] of Object.entries(targets)) {
  const [cur] = await sql`
    SELECT COALESCE(SUM(p.payout), 0)::int AS total
    FROM picks p JOIN subscribers s ON s.email = p.email
    WHERE p.status = 'won' AND s.preferences IN ('bot', 'npc') AND s.favorite_team = ${team}
  `;
  if (!cur.total) { console.log(`  ${team}: no payouts, skip`); continue; }
  const factor = target / cur.total;
  await sql`
    UPDATE picks SET payout = GREATEST(1, ROUND(payout * ${factor}::float8)::int)
    WHERE status = 'won' AND email IN (
      SELECT email FROM subscribers WHERE preferences IN ('bot', 'npc') AND favorite_team = ${team}
    )
  `;
  console.log(`  ${team}: ${cur.total} -> ~${target} (×${factor.toFixed(3)})`);
}

console.log("Rebalance done.");
