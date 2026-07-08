// One-time outage catch-up. Replicates the sync route's DB path but BYPASSES
// the compute gate, so matches that finished during the Neon outage (and are now
// outside the active window) still get written + their picks settled.
import { getWorldCupFixtures } from "../src/lib/apifootball";
import {
  ensureTable,
  ensureSubscribersTable,
  ensureGameSchema,
  upsertMatches,
  settleOpenPicks,
  type SyncedMatch,
} from "../src/lib/db";

async function main() {
  const fixtures = await getWorldCupFixtures();
  const matches: SyncedMatch[] = fixtures.map((f) => f.synced);
  const finishedWithScore = matches.filter(
    (m) => m.status === "FINISHED" && m.home_score !== null && m.away_score !== null
  );
  console.log(`fixtures fetched: ${matches.length} | finished w/ score: ${finishedWithScore.length}`);

  await ensureTable();
  await ensureSubscribersTable();
  const updated = await upsertMatches(matches);
  console.log(`upserted rows: ${updated}`);

  await ensureGameSchema();
  const settled = await settleOpenPicks();
  console.log(`picks settled: ${settled}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("catch-up failed:", e);
  process.exit(1);
});
