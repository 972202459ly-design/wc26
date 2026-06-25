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

export interface PlayerAnalytics {
  totalPredictions: number; // settled (won + lost)
  pending: number;
  wins: number;
  losses: number;
  accuracy: number; // 0..1 over settled
  siteAccuracy: number; // 0..1 across all players
  netPoints: number; // lifetime payout − stake on settled picks
  rank: number | null;
  totalPlayers: number;
  bestTeam: { team: string; wins: number } | null;
  last10: { result: "won" | "lost"; net: number; team: string }[];
  trend: { net: number }[]; // chronological net per settled pick (premium chart)
}

/** Aggregate a player's prediction performance for the analytics dashboard.
 *  All figures derive from settled (won/lost) picks; team names come from the
 *  synced match. Site accuracy is the community denominator for comparison. */
export async function getPlayerAnalytics(email: string): Promise<PlayerAnalytics> {
  const e = email.toLowerCase().trim();
  const sql = getSql();

  const [totals] = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('won','lost'))::int AS settled,
      COUNT(*) FILTER (WHERE status = 'open')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'won')::int AS wins,
      COALESCE(SUM(payout) FILTER (WHERE status = 'won'), 0)::int AS gross,
      COALESCE(SUM(stake) FILTER (WHERE status IN ('won','lost')), 0)::int AS staked
    FROM picks WHERE email = ${e}
  `) as any[];

  const settled = totals?.settled ?? 0;
  const wins = totals?.wins ?? 0;
  const losses = settled - wins;
  const netPoints = (totals?.gross ?? 0) - (totals?.staked ?? 0);

  const [site] = (await sql`
    SELECT COUNT(*) FILTER (WHERE status = 'won')::float
      / NULLIF(COUNT(*) FILTER (WHERE status IN ('won','lost')), 0) AS acc
    FROM picks
  `) as any[];

  // Settled picks with the team they backed, newest first — drives last-10,
  // best-team and the trend chart.
  const history = (await sql`
    SELECT p.pick, p.status, p.payout, p.stake,
      CASE WHEN p.pick = 'home' THEN m.home_team
           WHEN p.pick = 'away' THEN m.away_team
           ELSE 'Draw' END AS team
    FROM picks p
    JOIN match_scores m ON m.match_id = p.match_id
    WHERE p.email = ${e} AND p.status IN ('won','lost')
    ORDER BY p.settled_at DESC NULLS LAST, p.created_at DESC
    LIMIT 100
  `) as any[];

  const last10 = history.slice(0, 10).map((r) => ({
    result: (r.status === "won" ? "won" : "lost") as "won" | "lost",
    net: r.status === "won" ? r.payout - r.stake : -r.stake,
    team: r.team,
  }));

  // Best team = most wins backing that team (Draw excluded).
  const teamWins = new Map<string, number>();
  for (const r of history) {
    if (r.status === "won" && r.team && r.team !== "Draw") {
      teamWins.set(r.team, (teamWins.get(r.team) ?? 0) + 1);
    }
  }
  let bestTeam: { team: string; wins: number } | null = null;
  for (const [team, w] of teamWins) {
    if (!bestTeam || w > bestTeam.wins) bestTeam = { team, wins: w };
  }

  // Chronological net (oldest → newest) for the premium trend chart.
  const trend = history
    .slice()
    .reverse()
    .map((r) => ({ net: r.status === "won" ? r.payout - r.stake : -r.stake }));

  const ranked = await getRankedPlayers();
  const idx = ranked.findIndex((r) => r.email === e);

  return {
    totalPredictions: settled,
    pending: totals?.pending ?? 0,
    wins,
    losses,
    accuracy: settled > 0 ? wins / settled : 0,
    siteAccuracy: site?.acc ?? 0,
    netPoints,
    rank: idx >= 0 ? idx + 1 : null,
    totalPlayers: ranked.length,
    bestTeam,
    last10,
    trend,
  };
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
  if (stake < 10) return { ok: false, error: "Minimum 10 points per prediction" };

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

export interface SettledPick {
  email: string;
  match_id: string;
  pick: string; // "home" | "away" | "draw"
  status: string; // "won" | "lost"
  payout: number;
  stake: number;
}

/** Settled picks (won/lost) for a set of just-finished matches — used to build
 *  the personalized Final email. Keyed by email by the caller. */
export async function getSettledPicksForMatches(matchIds: string[]): Promise<SettledPick[]> {
  if (matchIds.length === 0) return [];
  const rows = await getSql()`
    SELECT email, match_id, pick, status, payout, stake
    FROM picks
    WHERE match_id = ANY(${matchIds}) AND status IN ('won', 'lost')
  `;
  return rows as unknown as SettledPick[];
}

export interface LeaderRow {
  rank: number;
  name: string;
  points: number;
  wins: number;
  bets: number;
  tier: "free" | "premium";
  favoriteTeam: string | null;
}

export async function getLeaderboard(limit = 50): Promise<LeaderRow[]> {
  const rows = await getSql()`
    SELECT s.email, s.username, s.points, s.preferences, s.favorite_team, s.created_at,
      COUNT(p.id) FILTER (WHERE p.status IN ('won','lost')) AS bets,
      COUNT(p.id) FILTER (WHERE p.status = 'won') AS wins
    FROM subscribers s
    LEFT JOIN picks p ON p.email = s.email
    WHERE s.preferences != 'bot'
    GROUP BY s.email, s.username, s.points, s.preferences, s.favorite_team, s.created_at
    ORDER BY s.points DESC, s.created_at ASC
    LIMIT ${limit}
  `;
  return (rows as any[]).map((r, i) => ({
    rank: i + 1,
    name: r.username || maskEmail(r.email),
    points: r.points,
    wins: Number(r.wins),
    bets: Number(r.bets),
    tier: r.preferences === "premium" ? "premium" : "free",
    favoriteTeam: r.favorite_team ?? null,
  }));
}

/** Homepage social-proof stats. Excludes both seed-bot populations ('bot' and
 *  'npc') from the real-player count; top score mirrors the public leaderboard. */
export async function getHomeStats(): Promise<{ players: number; topName: string | null; topPoints: number }> {
  const [p] = (await getSql()`
    SELECT COUNT(*)::int AS players FROM subscribers WHERE preferences NOT IN ('bot', 'npc')
  `) as any[];
  const ranked = await getRankedPlayers();
  const t = ranked[0];
  return { players: p?.players ?? 0, topName: t?.name ?? null, topPoints: t?.points ?? 0 };
}

export interface RankedPlayer {
  email: string;
  name: string;
  points: number;
  rank: number;
}

/** Full leaderboard ordering including emails — for personalized digest emails.
 *  Mirrors getLeaderboard's population (NPC bots included) so the rank a player
 *  sees in their email matches the public leaderboard. Every registered player
 *  is listed — including those who haven't predicted yet (they sit at their
 *  1000-point starting score), so the board shows the whole community. */
export async function getRankedPlayers(): Promise<RankedPlayer[]> {
  const rows = (await getSql()`
    SELECT email, username, points
    FROM subscribers
    WHERE preferences != 'bot'
    ORDER BY points DESC, created_at ASC
  `) as any[];
  return rows.map((r, i) => ({
    email: r.email,
    name: r.username || maskEmail(r.email),
    points: r.points,
    rank: i + 1,
  }));
}

/** How many distinct players have predicted a given match — social proof. */
export async function getMatchPredictorCount(matchId: string): Promise<number> {
  const [r] = (await getSql()`
    SELECT COUNT(DISTINCT email)::int AS c FROM picks WHERE match_id = ${matchId}
  `) as any[];
  return r?.c ?? 0;
}

/** Most-backed team (by number of fans) — for homepage social proof.
 *  Adds a base count per team so early-stage numbers look realistic. */
export async function getTopTeam(): Promise<{ teamId: string; fans: number } | null> {
  // Base fan counts per popular team (seeded social proof floor)
  const BASE: Record<string, number> = {
    arg: 3847, bra: 3214, fra: 2891, eng: 2673, ger: 2441,
    esp: 2218, por: 2104, ned: 1532, bel: 1287, usa: 1156,
  };
  const rows = (await getSql()`
    SELECT favorite_team AS team_id, COUNT(DISTINCT email)::int AS fans
    FROM subscribers
    WHERE favorite_team IS NOT NULL
    GROUP BY favorite_team
    ORDER BY fans DESC
    LIMIT 1
  `) as any[];
  if (!rows[0]) {
    // No real data yet — return Argentina as default with base count
    return { teamId: "arg", fans: BASE["arg"] };
  }
  const { team_id, fans } = rows[0];
  return { teamId: team_id, fans: fans + (BASE[team_id] ?? 500) };
}

/** Settled-pick stats for a finished match — for upset / big-event detection. */
export async function getMatchPickStats(matchId: string): Promise<{ total: number; correct: number }> {
  const [r] = (await getSql()`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('won', 'lost'))::int AS total,
      COUNT(*) FILTER (WHERE status = 'won')::int AS correct
    FROM picks WHERE match_id = ${matchId}
  `) as any[];
  return { total: r?.total ?? 0, correct: r?.correct ?? 0 };
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

// ─── Comments & Reactions ─────────────────────────────────────────────

export interface Comment {
  id: number;
  match_id: string;
  email: string | null;
  username: string;
  body: string;
  likes: number;
  dislikes: number;
  created_at: string;
}

export interface SocialPreview {
  reactions: Record<string, number>;
  topComment: string | null;
  commentCount: number;
}

export async function ensureCommentsSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS match_reactions (
      match_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (match_id, emoji)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS match_comments (
      id SERIAL PRIMARY KEY,
      match_id TEXT NOT NULL,
      email TEXT,
      username TEXT NOT NULL,
      body TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      dislikes INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE match_comments ADD COLUMN IF NOT EXISTS dislikes INTEGER NOT NULL DEFAULT 0`;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_comments_match ON match_comments(match_id)
  `;
}

export async function getReactions(matchId: string): Promise<Record<string, number>> {
  const rows = await getSql()`
    SELECT emoji, count FROM match_reactions WHERE match_id = ${matchId}
  `;
  const result: Record<string, number> = { fire: 0, ball: 0, shock: 0 };
  for (const r of rows as any[]) result[r.emoji] = r.count;
  return result;
}

export async function addReaction(matchId: string, emoji: string): Promise<Record<string, number>> {
  const allowed = ["fire", "ball", "shock"];
  if (!allowed.includes(emoji)) throw new Error("Invalid emoji");
  await getSql()`
    INSERT INTO match_reactions (match_id, emoji, count)
    VALUES (${matchId}, ${emoji}, 1)
    ON CONFLICT (match_id, emoji) DO UPDATE SET count = match_reactions.count + 1
  `;
  return getReactions(matchId);
}

export async function getComments(matchId: string): Promise<Comment[]> {
  const rows = await getSql()`
    SELECT id, match_id, email, username, body, likes, dislikes, created_at
    FROM match_comments
    WHERE match_id = ${matchId}
    ORDER BY likes DESC, created_at DESC
    LIMIT 100
  `;
  return rows as unknown as Comment[];
}

export async function addComment(
  matchId: string,
  email: string,
  username: string,
  body: string
): Promise<Comment> {
  const rows = await getSql()`
    INSERT INTO match_comments (match_id, email, username, body)
    VALUES (${matchId}, ${email}, ${username}, ${body})
    RETURNING id, match_id, email, username, body, likes, dislikes, created_at
  `;
  return (rows as unknown as Comment[])[0];
}

export async function likeComment(commentId: number): Promise<void> {
  await getSql()`
    UPDATE match_comments SET likes = likes + 1 WHERE id = ${commentId}
  `;
}

export async function dislikeComment(commentId: number): Promise<void> {
  await getSql()`
    UPDATE match_comments SET dislikes = dislikes + 1 WHERE id = ${commentId}
  `;
}

export async function getSocialPreviews(): Promise<Record<string, SocialPreview>> {
  const sql = getSql();
  const reactions = await sql`
    SELECT match_id, emoji, count FROM match_reactions WHERE count > 0
  `;
  const comments = await sql`
    SELECT DISTINCT ON (match_id) match_id, body, likes,
      (SELECT COUNT(*) FROM match_comments c2 WHERE c2.match_id = c.match_id)::int AS total
    FROM match_comments c
    ORDER BY match_id, likes DESC, created_at DESC
  `;

  const result: Record<string, SocialPreview> = {};

  for (const r of reactions as any[]) {
    if (!result[r.match_id]) result[r.match_id] = { reactions: { fire: 0, ball: 0, shock: 0 }, topComment: null, commentCount: 0 };
    result[r.match_id].reactions[r.emoji] = r.count;
  }
  for (const c of comments as any[]) {
    if (!result[c.match_id]) result[c.match_id] = { reactions: { fire: 0, ball: 0, shock: 0 }, topComment: null, commentCount: 0 };
    result[c.match_id].topComment = c.body;
    result[c.match_id].commentCount = c.total;
  }
  return result;
}
