/**
 * Twitter Bot — Standalone script
 *
 * Usage:
 *   TWITTER_API_KEY=xxx TWITTER_API_SECRET=xxx \
 *   TWITTER_ACCESS_TOKEN=xxx TWITTER_ACCESS_SECRET=xxx \
 *   FOOTBALL_DATA_API_KEY=xxx \
 *   npx tsx scripts/twitter-bot.ts
 *
 * Posts finished/live match results to X/Twitter.
 * Tracks tweeted matches in tweeted_matches.json to avoid duplicates.
 */

import { TwitterApi } from "twitter-api-v2";
import * as fs from "fs";
import * as path from "path";

// ─── Config ───────────────────────────────────────────────────────────

const API_KEY = process.env.FOOTBALL_DATA_API_KEY!;
const COMPETITION_ID = 2000; // World Cup
const TRACKING_FILE = path.join(__dirname, "tweeted_matches.json");

const TWITTER_CONFIG = {
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
};

// ─── Tracked matches (dedup) ──────────────────────────────────────────

function loadTweeted(): Set<number> {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = JSON.parse(fs.readFileSync(TRACKING_FILE, "utf-8"));
      return new Set(data);
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveTweeted(tweeted: Set<number>): void {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify([...tweeted]), "utf-8");
}

// ─── Football-data.org API ────────────────────────────────────────────

interface FootballMatch {
  id: number;
  status: string;
  stage: string;
  group: string | null;
  utcDate: string;
  homeTeam: { name: string; tla: string };
  awayTeam: { name: string; tla: string };
  score: { fullTime: { home: number | null; away: number | null } };
}

interface FootballDataResponse {
  matches: FootballMatch[];
}

async function fetchMatches(): Promise<FootballMatch[]> {
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches?season=2026`,
    { headers: { "X-Auth-Token": API_KEY } }
  );

  if (!res.ok) {
    throw new Error(`football-data.org returned ${res.status}: ${await res.text()}`);
  }

  const data: FootballDataResponse = await res.json();
  return data.matches;
}

// ─── Tweet formatting ─────────────────────────────────────────────────

function formatTweet(m: FootballMatch): string | null {
  if (m.score.fullTime.home === null || m.score.fullTime.away === null) return null;

  const stage = m.stage?.replace(/_/g, " ") || "Match";
  const home = m.homeTeam.name;
  const away = m.awayTeam.name;
  const score = `${m.score.fullTime.home} - ${m.score.fullTime.away}`;

  if (m.status === "FINISHED") {
    return `🟢 FT | ${stage}\n\n${home} ${score} ${away}\n\n#WorldCup2026 #FIFAWorldCup`;
  }

  if (m.status === "IN_PLAY" || m.status === "PAUSED") {
    return `🔴 LIVE | ${stage}\n\n${home} ${score} ${away}\n\n#WorldCup2026 #FIFAWorldCup`;
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  // Validate credentials
  const missing = Object.entries(TWITTER_CONFIG)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error(`Missing Twitter credentials: ${missing.join(", ")}`);
    console.error("Set them as env vars and try again.");
    process.exit(1);
  }

  if (!API_KEY) {
    console.error("Missing FOOTBALL_DATA_API_KEY env var");
    process.exit(1);
  }

  console.log("Fetching matches from football-data.org...");
  const matches = await fetchMatches();
  console.log(`Found ${matches.length} matches`);

  const tweeted = loadTweeted();
  const client = new TwitterApi(TWITTER_CONFIG);
  let posted = 0;

  for (const m of matches) {
    if (m.status !== "FINISHED" && m.status !== "IN_PLAY" && m.status !== "PAUSED") continue;
    if (tweeted.has(m.id)) continue;

    const text = formatTweet(m);
    if (!text) continue;

    try {
      const tweet = await client.v2.tweet(text);
      tweeted.add(m.id);
      posted++;
      console.log(`✅ ${m.homeTeam.tla}-${m.awayTeam.tla}: https://x.com/i/status/${tweet.data.id}`);
    } catch (err: any) {
      console.error(`❌ Failed to tweet ${m.homeTeam.tla}-${m.awayTeam.tla}: ${err.message}`);
    }
  }

  saveTweeted(tweeted);
  console.log(`\nDone. Posted ${posted} new tweet(s).`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
