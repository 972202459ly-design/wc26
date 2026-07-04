import { neon } from "@neondatabase/serverless";
import { recordEvent } from "./events";

// ─── Private leagues ──────────────────────────────────────────────────
// A paid host creates a league (one-time League Host purchase), gets an invite
// code, and friends/coworkers join for free. Each member is a normal player
// (email = identity, same points engine), so joining a league naturally pulls
// people into the email + Premium funnel. The league's invite `code` is its
// canonical URL id — avoids two clashing dynamic segments under /leagues.

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export type LeagueTier = "host30" | "host100";

export interface League {
  id: number;
  code: string;
  name: string;
  ownerEmail: string;
  maxMembers: number;
  tier: LeagueTier;
  emoji: string | null;
  paid: boolean;
  createdAt: string;
}

export interface LeagueMemberRow {
  rank: number;
  email: string;
  name: string;
  points: number;
  isOwner: boolean;
}

export const LEAGUE_TIERS: Record<LeagueTier, { maxMembers: number; priceLabel: string; envKey: string }> = {
  host30: { maxMembers: 30, priceLabel: "$14.99", envKey: "NEXT_PUBLIC_PADDLE_LEAGUE_PRICE_ID" },
  host100: { maxMembers: 100, priceLabel: "$29.99", envKey: "NEXT_PUBLIC_PADDLE_LEAGUE100_PRICE_ID" },
};

let leaguesSchemaReady = false;

export async function ensureLeaguesSchema(): Promise<void> {
  if (leaguesSchemaReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS leagues (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      max_members INTEGER NOT NULL DEFAULT 30,
      tier TEXT NOT NULL DEFAULT 'host30',
      emoji TEXT,
      paid BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS league_members (
      league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (league_id, email)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_league_members_email ON league_members (email)`;
  leaguesSchemaReady = true;
}

// Unambiguous code alphabet (no 0/O/1/I) — easy to read aloud / type.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

function rowToLeague(r: any): League {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    ownerEmail: r.owner_email,
    maxMembers: r.max_members,
    tier: r.tier === "host100" ? "host100" : "host30",
    emoji: r.emoji ?? null,
    paid: r.paid,
    createdAt: r.created_at,
  };
}

/**
 * Create a draft (unpaid) league with the owner already enrolled as a member.
 * The league becomes active once the League Host purchase webhook flips `paid`.
 * Retries on the (vanishingly unlikely) code collision.
 */
export async function createLeague(
  ownerEmail: string,
  name: string,
  tier: LeagueTier
): Promise<League> {
  await ensureLeaguesSchema();
  const sql = getSql();
  const e = ownerEmail.toLowerCase().trim();
  const maxMembers = LEAGUE_TIERS[tier].maxMembers;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      const rows = (await sql`
        INSERT INTO leagues (code, name, owner_email, max_members, tier, paid)
        VALUES (${code}, ${name}, ${e}, ${maxMembers}, ${tier}, FALSE)
        RETURNING *
      `) as any[];
      const league = rowToLeague(rows[0]);
      await sql`
        INSERT INTO league_members (league_id, email, role)
        VALUES (${league.id}, ${e}, 'owner')
        ON CONFLICT (league_id, email) DO NOTHING
      `;
      return league;
    } catch (err: any) {
      // Unique violation on code → retry with a fresh code.
      if (String(err?.message || err).includes("leagues_code_key")) continue;
      throw err;
    }
  }
  throw new Error("Could not allocate a unique league code");
}

export async function getLeagueByCode(code: string): Promise<League | null> {
  await ensureLeaguesSchema();
  const rows = (await getSql()`
    SELECT * FROM leagues WHERE code = ${code.toUpperCase().trim()}
  `) as any[];
  return rows[0] ? rowToLeague(rows[0]) : null;
}

export async function getLeagueById(id: number): Promise<League | null> {
  await ensureLeaguesSchema();
  const rows = (await getSql()`SELECT * FROM leagues WHERE id = ${id}`) as any[];
  return rows[0] ? rowToLeague(rows[0]) : null;
}

/** Flip a league to paid/active. Called from the Paddle webhook after the
 *  League Host purchase completes. Idempotent. */
export async function markLeaguePaid(leagueId: number): Promise<void> {
  await ensureLeaguesSchema();
  await getSql()`UPDATE leagues SET paid = TRUE WHERE id = ${leagueId}`;
}

export async function memberCount(leagueId: number): Promise<number> {
  const [r] = (await getSql()`
    SELECT COUNT(*)::int AS c FROM league_members WHERE league_id = ${leagueId}
  `) as any[];
  return r?.c ?? 0;
}

export async function isMember(leagueId: number, email: string): Promise<boolean> {
  const rows = (await getSql()`
    SELECT 1 FROM league_members WHERE league_id = ${leagueId} AND email = ${email.toLowerCase().trim()}
  `) as any[];
  return rows.length > 0;
}

export type JoinResult =
  | { ok: true; league: League; alreadyMember: boolean }
  | { ok: false; error: string };

/** Add a player to a league via its invite code. Free for invitees. Enforces
 *  paid/active status and the capacity cap. Idempotent for existing members. */
export async function joinLeague(code: string, email: string): Promise<JoinResult> {
  await ensureLeaguesSchema();
  const sql = getSql();
  const e = email.toLowerCase().trim();
  const league = await getLeagueByCode(code);
  if (!league) return { ok: false, error: "League not found" };
  if (!league.paid) return { ok: false, error: "This league isn’t active yet" };

  if (await isMember(league.id, e)) return { ok: true, league, alreadyMember: true };

  if ((await memberCount(league.id)) >= league.maxMembers) {
    return { ok: false, error: "This league is full" };
  }

  // Ensure a player row exists so the new member shows on the points engine.
  await sql`
    INSERT INTO subscribers (email, preferences, points)
    VALUES (${e}, 'free', 1000)
    ON CONFLICT (email) DO NOTHING
  `;
  await sql`
    INSERT INTO league_members (league_id, email, role)
    VALUES (${league.id}, ${e}, 'member')
    ON CONFLICT (league_id, email) DO NOTHING
  `;
  recordEvent("private_league_invite_joined", {
    source: "league",
    email: e,
    props: { code: league.code, leagueId: league.id },
  });
  return { ok: true, league, alreadyMember: false };
}

export interface UserLeague extends League {
  members: number;
  role: string;
}

/** Every league a player owns or has joined — for the /leagues hub. */
export async function getUserLeagues(email: string): Promise<UserLeague[]> {
  await ensureLeaguesSchema();
  const e = email.toLowerCase().trim();
  const rows = (await getSql()`
    SELECT l.*, m.role,
      (SELECT COUNT(*)::int FROM league_members lm WHERE lm.league_id = l.id) AS members
    FROM league_members m
    JOIN leagues l ON l.id = m.league_id
    WHERE m.email = ${e}
    ORDER BY l.created_at DESC
  `) as any[];
  return rows.map((r) => ({ ...rowToLeague(r), members: r.members, role: r.role }));
}

/** Private leaderboard: members ranked by their (global) points balance. */
export async function getLeagueLeaderboard(leagueId: number): Promise<LeagueMemberRow[]> {
  await ensureLeaguesSchema();
  const rows = (await getSql()`
    SELECT m.email, m.role, s.id, s.username, s.points
    FROM league_members m
    LEFT JOIN subscribers s ON s.email = m.email
    WHERE m.league_id = ${leagueId}
    ORDER BY COALESCE(s.points, 1000) DESC, m.joined_at ASC
  `) as any[];
  return rows.map((r, i) => ({
    rank: i + 1,
    email: r.email,
    name: publicName(r.username, r.id),
    points: r.points ?? 1000,
    isOwner: r.role === "owner",
  }));
}

/** Public display name — never expose the email (or its structure). Falls back
 *  to a stable, anonymous "Player #<id>" until the player sets a nickname. */
function publicName(username: string | null | undefined, id: number | null): string {
  const nick = username?.trim();
  if (nick) return nick;
  return id != null ? `Player #${id}` : "Player";
}
