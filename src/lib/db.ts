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

export interface Subscriber {
  id: number;
  email: string;
  preferences: string;
}

export async function ensureSubscribersTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      preferences TEXT DEFAULT 'daily',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function getSubscribers(): Promise<Subscriber[]> {
  const rows = await sql`SELECT id, email, preferences FROM subscribers`;
  return rows as unknown as Subscriber[];
}
