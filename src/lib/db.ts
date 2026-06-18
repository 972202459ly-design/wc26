import { neon } from "@neondatabase/serverless";

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export interface SyncedMatch {
  api_id: number;
  match_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  stage: string | null;
  group_name: string | null;
  utc_date: string;
}

export async function ensureTable(): Promise<void> {
  await getSql()`
    CREATE TABLE IF NOT EXISTS match_scores (
      api_id INTEGER PRIMARY KEY,
      match_id TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT NOT NULL DEFAULT 'TIMED',
      stage TEXT,
      group_name TEXT,
      utc_date TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function upsertMatch(m: SyncedMatch): Promise<void> {
  await getSql()`
    INSERT INTO match_scores (api_id, match_id, home_team, away_team, home_score, away_score, status, stage, group_name, utc_date, updated_at)
    VALUES (${m.api_id}, ${m.match_id}, ${m.home_team}, ${m.away_team}, ${m.home_score}, ${m.away_score}, ${m.status}, ${m.stage}, ${m.group_name}, ${m.utc_date}, NOW())
    ON CONFLICT (api_id) DO UPDATE SET
      home_score = ${m.home_score},
      away_score = ${m.away_score},
      status = ${m.status},
      stage = ${m.stage},
      group_name = ${m.group_name},
      utc_date = ${m.utc_date},
      updated_at = NOW()
  `;
}

export async function getAllScores(): Promise<SyncedMatch[]> {
  const rows = await getSql()`
    SELECT * FROM match_scores ORDER BY utc_date ASC
  `;
  return rows as unknown as SyncedMatch[];
}

export async function getScoreByApiId(apiId: number): Promise<SyncedMatch | null> {
  const rows = await getSql()`
    SELECT * FROM match_scores WHERE api_id = ${apiId}
  `;
  return (rows as unknown as SyncedMatch[])[0] ?? null;
}

export async function getLastSyncTime(): Promise<Date | null> {
  const rows = await getSql()`
    SELECT updated_at FROM match_scores ORDER BY updated_at DESC LIMIT 1
  `;
  if (rows.length === 0) return null;
  return new Date((rows as any)[0].updated_at);
}

// ─── Subscribers ──────────────────────────────────────────────────────

export async function ensureSubscribersTable(): Promise<void> {
  await getSql()`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      preferences TEXT NOT NULL DEFAULT 'daily',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function subscribeEmail(
  email: string,
  preferences: string
): Promise<{ id: number; email: string; preferences: string }> {
  const result = await getSql()`
    INSERT INTO subscribers (email, preferences)
    VALUES (${email}, ${preferences})
    ON CONFLICT (email) DO UPDATE SET preferences = EXCLUDED.preferences
    RETURNING id, email, preferences
  `;
  return result[0] as unknown as { id: number; email: string; preferences: string };
}

export async function getSubscribers(): Promise<{ email: string; preferences: string }[]> {
  const rows = await getSql()`
    SELECT email, preferences FROM subscribers
  `;
  return rows as unknown as { email: string; preferences: string }[];
}

export async function deleteSubscriber(email: string): Promise<void> {
  await getSql()`
    DELETE FROM subscribers WHERE email = ${email}
  `;
}

// ─── Password auth ────────────────────────────────────────────────────

let authColumnsReady = false;

export async function ensureAuthColumns(): Promise<void> {
  if (authColumnsReady) return;
  await ensureSubscribersTable();
  await getSql()`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  authColumnsReady = true;
}

export async function getPasswordHash(email: string): Promise<string | null> {
  const rows = await getSql()`
    SELECT password_hash FROM subscribers WHERE email = ${email.toLowerCase().trim()}
  `;
  return (rows as unknown as { password_hash: string | null }[])[0]?.password_hash ?? null;
}

export async function setPassword(email: string, passwordHash: string): Promise<void> {
  const e = email.toLowerCase().trim();
  await getSql()`
    INSERT INTO subscribers (email, preferences, points, password_hash)
    VALUES (${e}, 'free', ${INITIAL_POINTS}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET password_hash = ${passwordHash}
  `;
}

/** Tier for a given email: "premium" iff preferences = 'premium', else "free". */
export async function getTierByEmail(email: string): Promise<"free" | "premium"> {
  const rows = await getSql()`
    SELECT preferences FROM subscribers WHERE email = ${email.toLowerCase().trim()}
  `;
  const prefs = (rows as unknown as { preferences: string }[])[0]?.preferences;
  return prefs === "premium" ? "premium" : "free";
}

// ─── Prediction analysis cache ────────────────────────────────────────
// Only the LLM-generated narrative is cached (win % / xG are computed live and
// deterministically). Cached per match so DeepSeek is called once, not per view.

export async function ensurePredictionsTable(): Promise<void> {
  await getSql()`
    CREATE TABLE IF NOT EXISTS predictions (
      match_id TEXT PRIMARY KEY,
      analysis TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function getCachedAnalysis(matchId: string): Promise<string | null> {
  const rows = await getSql()`
    SELECT analysis FROM predictions WHERE match_id = ${matchId}
  `;
  return (rows as unknown as { analysis: string }[])[0]?.analysis ?? null;
}

export async function upsertAnalysis(matchId: string, analysis: string): Promise<void> {
  await getSql()`
    INSERT INTO predictions (match_id, analysis, updated_at)
    VALUES (${matchId}, ${analysis}, NOW())
    ON CONFLICT (match_id) DO UPDATE SET analysis = ${analysis}, updated_at = NOW()
  `;
}

// ─── Prediction game (free-to-play virtual points) ────────────────────
// Players stake free virtual points on match outcomes at AI-derived odds.
// No real-money purchase of points and no cash-out — a skill contest, not
// gambling (keeps Paddle + AdSense compliant). Identity = email (same as auth).

export const INITIAL_POINTS = 1000;
export const DAILY_TOPUP_FREE = 200;
export const DAILY_TOPUP_PREMIUM = 500;

export interface Player {
  email: string;
  points: number;
  username: string | null;
  favoriteTeam: string | null;
  tier: "free" | "premium";
}

export interface TeamLeaderRow {
  rank: number;
  teamId: string;
  totalPoints: number;
  supporters: number;
}

export interface Pick {
  id: number;
  email: string;
  match_id: string;
  pick: string;
  stake: number;
  odds: number;
  status: string; // open | won | lost | void
  payout: number;
  created_at: string;
  settled_at: string | null;
}

let gameSchemaReady = false;

export async function ensureGameSchema(): Promise<void> {
  if (gameSchemaReady) return;
  const sql = getSql();
  await ensureSubscribersTable();
  // DDL DEFAULT can't be a bind parameter, so the literal must match INITIAL_POINTS (1000).
  await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 1000`;
  await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS last_topup DATE`;
  await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS username TEXT`;
  await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS favorite_team TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS picks (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      match_id TEXT NOT NULL,
      pick TEXT NOT NULL,
      stake INTEGER NOT NULL,
      odds REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      payout INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      settled_at TIMESTAMP,
      UNIQUE(email, match_id)
    )
  `;
  gameSchemaReady = true;
}

/** Ensure a player row exists (free-tier, initial points) and return it. */
export async function getOrCreatePlayer(email: string): Promise<Player> {
  const e = email.toLowerCase().trim();
  const sql = getSql();
  await sql`
    INSERT INTO subscribers (email, preferences, points)
    VALUES (${e}, 'free', ${INITIAL_POINTS})
    ON CONFLICT (email) DO NOTHING
  `;
  const rows = await sql`
    SELECT email, points, username, favorite_team, preferences FROM subscribers WHERE email = ${e}
  `;
  const r = (rows as any[])[0];
  return {
    email: e,
    points: r?.points ?? INITIAL_POINTS,
    username: r?.username ?? null,
    favoriteTeam: r?.favorite_team ?? null,
    tier: r?.preferences === "premium" ? "premium" : "free",
  };
}

/** Grant a free daily top-up once per calendar day. Returns the new balance. */
export async function dailyTopup(email: string): Promise<number> {
  const e = email.toLowerCase().trim();
  const player = await getOrCreatePlayer(e);
  const amount = player.tier === "premium" ? DAILY_TOPUP_PREMIUM : DAILY_TOPUP_FREE;
  const rows = await getSql()`
    UPDATE subscribers
    SET points = points + ${amount}, last_topup = CURRENT_DATE
    WHERE email = ${e} AND (last_topup IS NULL OR last_topup < CURRENT_DATE)
    RETURNING points
  `;
  if ((rows as any[]).length) return (rows as any[])[0].points;
  return player.points; // already topped up today
}

export async function getUserPick(email: string, matchId: string): Promise<Pick | null> {
  const rows = await getSql()`
    SELECT * FROM picks WHERE email = ${email.toLowerCase().trim()} AND match_id = ${matchId}
  `;
  return (rows as unknown as Pick[])[0] ?? null;
}

export async function getUserPicks(email: string): Promise<Pick[]> {
  const rows = await getSql()`
    SELECT * FROM picks WHERE email = ${email.toLowerCase().trim()} ORDER BY created_at DESC LIMIT 100
  `;
  return rows as unknown as Pick[];
}

/**
 * Place (or replace, before kickoff) a stake on a match outcome. Refunds any
 * prior open stake on the same match, then deducts the new stake. Returns the
 * new balance, or an error string if the stake exceeds the balance.
 */
export async function placePick(
  email: string,
  matchId: string,
  pick: "home" | "draw" | "away",
  stake: number,
  odds: number
): Promise<{ ok: true; points: number } | { ok: false; error: string }> {
  const e = email.toLowerCase().trim();
  const sql = getSql();
  await getOrCreatePlayer(e);

  const existing = await getUserPick(e, matchId);
  if (existing && existing.status !== "open") {
    return { ok: false, error: "This match is already settled" };
  }
  const refund = existing?.stake ?? 0;

  const balRows = await sql`SELECT points FROM subscribers WHERE email = ${e}`;
  const balance = (balRows as any[])[0]?.points ?? 0;
  const effective = balance + refund;
  if (stake > effective) return { ok: false, error: "Not enough points" };
  if (stake < 10) return { ok: false, error: "Minimum stake is 10 points" };

  const newBalance = effective - stake;
  await sql`UPDATE subscribers SET points = ${newBalance} WHERE email = ${e}`;
  await sql`
    INSERT INTO picks (email, match_id, pick, stake, odds, status)
    VALUES (${e}, ${matchId}, ${pick}, ${stake}, ${odds}, 'open')
    ON CONFLICT (email, match_id) DO UPDATE SET
      pick = ${pick}, stake = ${stake}, odds = ${odds}, status = 'open',
      payout = 0, created_at = NOW(), settled_at = NULL
  `;
  return { ok: true, points: newBalance };
}

/**
 * Settle every open pick whose match has finished. Idempotent: only touches
 * status='open' rows, so it is safe to run on every score sync.
 */
export async function settleOpenPicks(): Promise<number> {
  const sql = getSql();
  // Open picks joined to their finished match's result.
  const rows = await sql`
    SELECT p.id, p.email, p.pick, p.stake, p.odds, m.home_score, m.away_score
    FROM picks p
    JOIN match_scores m ON m.match_id = p.match_id
    WHERE p.status = 'open' AND m.status = 'FINISHED'
      AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
  `;
  let settled = 0;
  for (const r of rows as any[]) {
    const result = r.home_score > r.away_score ? "home" : r.home_score < r.away_score ? "away" : "draw";
    const won = r.pick === result;
    const payout = won ? Math.round(r.stake * r.odds) : 0;
    await sql`UPDATE picks SET status = ${won ? "won" : "lost"}, payout = ${payout}, settled_at = NOW() WHERE id = ${r.id}`;
    if (won) {
      await sql`UPDATE subscribers SET points = points + ${payout} WHERE email = ${r.email}`;
    }
    settled++;
  }
  return settled;
}

export interface LeaderRow {
  rank: number;
  name: string;
  points: number;
  wins: number;
  bets: number;
  tier: "free" | "premium";
}

export async function getLeaderboard(limit = 50): Promise<LeaderRow[]> {
  const rows = await getSql()`
    SELECT s.email, s.username, s.points, s.preferences,
      COUNT(p.id) FILTER (WHERE p.status IN ('won','lost')) AS bets,
      COUNT(p.id) FILTER (WHERE p.status = 'won') AS wins
    FROM subscribers s
    LEFT JOIN picks p ON p.email = s.email
    GROUP BY s.email, s.username, s.points, s.preferences
    HAVING COUNT(p.id) > 0
    ORDER BY s.points DESC
    LIMIT ${limit}
  `;
  return (rows as any[]).map((r, i) => ({
    rank: i + 1,
    name: r.username || maskEmail(r.email),
    points: r.points,
    wins: Number(r.wins),
    bets: Number(r.bets),
    tier: r.preferences === "premium" ? "premium" : "free",
  }));
}

export async function setUsername(email: string, username: string): Promise<void> {
  await getSql()`UPDATE subscribers SET username = ${username} WHERE email = ${email.toLowerCase().trim()}`;
}

export async function setFavoriteTeam(email: string, teamId: string): Promise<void> {
  await getSql()`UPDATE subscribers SET favorite_team = ${teamId} WHERE email = ${email.toLowerCase().trim()}`;
}

export async function getTeamLeaderboard(limit = 48): Promise<TeamLeaderRow[]> {
  const rows = await getSql()`
    SELECT
      s.favorite_team AS team_id,
      COALESCE(SUM(p.payout) FILTER (WHERE p.status = 'won'), 0) AS total_points,
      COUNT(DISTINCT s.email) AS supporters
    FROM subscribers s
    LEFT JOIN picks p ON p.email = s.email
    WHERE s.favorite_team IS NOT NULL
      AND s.preferences NOT LIKE 'bot%'
    GROUP BY s.favorite_team
    ORDER BY total_points DESC, supporters DESC
    LIMIT ${limit}
  `;
  return (rows as any[]).map((r, i) => ({
    rank: i + 1,
    teamId: r.team_id,
    totalPoints: Number(r.total_points),
    supporters: Number(r.supporters),
  }));
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "player";
  return `${name.slice(0, 2)}***@${domain}`;
}

// ─── Subscriptions (Paddle) ───────────────────────────────────────────

export async function ensureSubscriptionsTable(): Promise<void> {
  await getSql()`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      paddle_subscription_id TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      plan_type TEXT NOT NULL DEFAULT 'monthly',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

// ─── Tweet tracking ───────────────────────────────────────────────────

export async function ensureTweetTable(): Promise<void> {
  await getSql()`
    CREATE TABLE IF NOT EXISTS tweeted_matches (
      api_id INTEGER PRIMARY KEY,
      tweet_id TEXT NOT NULL,
      tweeted_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function isMatchTweeted(apiId: number): Promise<boolean> {
  const rows = await getSql()`
    SELECT 1 FROM tweeted_matches WHERE api_id = ${apiId}
  `;
  return rows.length > 0;
}

export async function markMatchTweeted(apiId: number, tweetId: string): Promise<void> {
  await getSql()`
    INSERT INTO tweeted_matches (api_id, tweet_id) VALUES (${apiId}, ${tweetId})
    ON CONFLICT (api_id) DO NOTHING
  `;
}

// ─── Pre-match reminders ──────────────────────────────────────────────

export async function ensurePrematchRemindersTable(): Promise<void> {
  await getSql()`
    CREATE TABLE IF NOT EXISTS prematch_reminders (
      api_id INTEGER PRIMARY KEY,
      reminded_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function isReminderSent(apiId: number): Promise<boolean> {
  const rows = await getSql()`
    SELECT 1 FROM prematch_reminders WHERE api_id = ${apiId}
  `;
  return rows.length > 0;
}

export async function markReminderSent(apiId: number): Promise<void> {
  await getSql()`
    INSERT INTO prematch_reminders (api_id) VALUES (${apiId})
    ON CONFLICT (api_id) DO NOTHING
  `;
}
