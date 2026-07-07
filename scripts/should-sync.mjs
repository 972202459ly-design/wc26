// Gate for the sync-scores GitHub Action. Decides — without ever calling the
// Vercel endpoint — whether any match is inside its live window right now, so
// off-hours cron runs don't burn a Function Invocation for nothing. Mirrors
// the same window the API route itself uses (src/app/api/scores/sync/route.ts)
// so the two stay in sync if that window is ever tuned.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "..", "src", "lib", "data.ts"), "utf8");

const WINDOW_BEFORE_MS = 20 * 60 * 1000;
const WINDOW_AFTER_MS = 3 * 60 * 60 * 1000;

const now = Date.now();
const pattern = /"(\d{4}-\d{2}-\d{2})",\s*"(\d{2}:\d{2}:\d{2}Z)"/g;

let anyActive = false;
let match;
while ((match = pattern.exec(src)) !== null) {
  const ko = new Date(`${match[1]}T${match[2]}`).getTime();
  if (Number.isNaN(ko)) continue;
  if (now >= ko - WINDOW_BEFORE_MS && now <= ko + WINDOW_AFTER_MS) {
    anyActive = true;
    break;
  }
}

console.log(anyActive ? "active" : "idle");
process.exit(anyActive ? 0 : 1);
