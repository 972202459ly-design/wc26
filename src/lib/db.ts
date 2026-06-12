import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

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
  await sql`
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
  await sql`
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
  const rows = await sql`
    SELECT * FROM match_scores ORDER BY utc_date ASC
  `;
  return rows as unknown as SyncedMatch[];
}

export async function getScoreByApiId(apiId: number): Promise<SyncedMatch | null> {
  const rows = await sql`
    SELECT * FROM match_scores WHERE api_id = ${apiId}
  `;
  return (rows as unknown as SyncedMatch[])[0] ?? null;
}

export async function getLastSyncTime(): Promise<Date | null> {
  const rows = await sql`
    SELECT updated_at FROM match_scores ORDER BY updated_at DESC LIMIT 1
  `;
  if (rows.length === 0) return null;
  return new Date((rows as any)[0].updated_at);
}

// ─── Subscribers ──────────────────────────────────────────────────────

export async function ensureSubscribersTable(): Promise<void> {
  await sql`
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
  const result = await sql`
    INSERT INTO subscribers (email, preferences)
    VALUES (${email}, ${preferences})
    ON CONFLICT (email) DO UPDATE SET preferences = EXCLUDED.preferences
    RETURNING id, email, preferences
  `;
  return result[0] as unknown as { id: number; email: string; preferences: string };
}

export async function getSubscribers(): Promise<{ email: string; preferences: string }[]> {
  const rows = await sql`
    SELECT email, preferences FROM subscribers
  `;
  return rows as unknown as { email: string; preferences: string }[];
}

// ─── Subscriptions (Paddle) ───────────────────────────────────────────

export async function ensureSubscriptionsTable(): Promise<void> {
  await sql`
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
  await sql`
    CREATE TABLE IF NOT EXISTS tweeted_matches (
      api_id INTEGER PRIMARY KEY,
      tweet_id TEXT NOT NULL,
      tweeted_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function isMatchTweeted(apiId: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM tweeted_matches WHERE api_id = ${apiId}
  `;
  return rows.length > 0;
}

export async function markMatchTweeted(apiId: number, tweetId: string): Promise<void> {
  await sql`
    INSERT INTO tweeted_matches (api_id, tweet_id) VALUES (${apiId}, ${tweetId})
    ON CONFLICT (api_id) DO NOTHING
  `;
}

// ─── Pre-match reminders ──────────────────────────────────────────────

export async function ensurePrematchRemindersTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS prematch_reminders (
      api_id INTEGER PRIMARY KEY,
      reminded_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function isReminderSent(apiId: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM prematch_reminders WHERE api_id = ${apiId}
  `;
  return rows.length > 0;
}

export async function markReminderSent(apiId: number): Promise<void> {
  await sql`
    INSERT INTO prematch_reminders (api_id) VALUES (${apiId})
    ON CONFLICT (api_id) DO NOTHING
  `;
}
