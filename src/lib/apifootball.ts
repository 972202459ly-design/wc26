import type { SyncedMatch } from "./db";
import { tlaFromName } from "./data";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1; // FIFA World Cup
const SEASON = 2026;

function headers() {
  return { "x-apisports-key": process.env.API_FOOTBALL_KEY || "" };
}

// API-Football fixture.status.short → our internal status vocabulary
// (kept identical to the old football-data values so downstream logic is unchanged).
export function mapStatus(short: string): string {
  if (["1H", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(short)) return "IN_PLAY";
  if (short === "HT") return "PAUSED";
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(short)) return "FINISHED";
  return "TIMED"; // TBD, NS, PST, CANC, ABD, SUSP
}

// API-Football league.round → our stage codes (matches /bracket + email stageLabel).
export function mapStage(round: string): string {
  const r = (round || "").toLowerCase();
  if (r.includes("group")) return "GROUP_STAGE";
  if (r.includes("32")) return "ROUND_OF_32"; // 48-team format: first KO round
  if (r.includes("16")) return "LAST_16";
  if (r.includes("quarter")) return "QUARTER_FINALS";
  if (r.includes("semi")) return "SEMI_FINALS";
  if (r.includes("third") || r.includes("3rd")) return "THIRD_PLACE";
  if (r.includes("final")) return "FINAL";
  return "GROUP_STAGE";
}

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "").slice(0, 6);
}

// Build the same match_id scheme the site's static pages use (tla-tla).
export function matchIdFor(home: string, away: string): string {
  return `${tlaFromName(home) || slug(home)}-${tlaFromName(away) || slug(away)}`;
}

export interface ApiFixture {
  synced: SyncedMatch;
  halfTime: { home: number; away: number } | null;
}

export async function getWorldCupFixtures(): Promise<ApiFixture[]> {
  const res = await fetch(`${BASE}/fixtures?league=${LEAGUE}&season=${SEASON}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`API-Football fixtures HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors && (Array.isArray(data.errors) ? data.errors.length : Object.keys(data.errors).length)) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }
  return (data.response || []).map((f: any): ApiFixture => {
    const home = f.teams.home.name;
    const away = f.teams.away.name;
    const ht = f.score?.halftime;
    return {
      synced: {
        api_id: f.fixture.id,
        match_id: matchIdFor(home, away),
        home_team: home,
        away_team: away,
        home_score: f.goals?.home ?? null,
        away_score: f.goals?.away ?? null,
        status: mapStatus(f.fixture.status?.short ?? "NS"),
        stage: mapStage(f.league?.round ?? ""),
        group_name: null,
        utc_date: f.fixture.date,
      },
      halfTime:
        ht && ht.home != null && ht.away != null ? { home: ht.home, away: ht.away } : null,
    };
  });
}

export interface GoalEvent {
  minute: number;
  scorer: string;
  assist: string | null;
  team: string;
  detail: string;
}

export type MatchEventType = "goal" | "yellow_card" | "red_card" | "substitution" | "var";
export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  teamName: string;
  player: string | null;
  assist: string | null;
  detail: string;
}

function classify(e: any): MatchEventType | null {
  const type = e.type;
  const detail = (e.detail || "").toLowerCase();
  if (type === "Goal") return "goal";
  if (type === "Card") return detail.includes("red") ? "red_card" : "yellow_card";
  if (type === "subst") return "substitution";
  if (type === "Var") return "var";
  return null;
}

// All timeline events for a fixture (goals, cards, subs, VAR), chronological.
// Cached ~20s so concurrent viewers don't multiply API usage.
export async function getMatchEvents(fixtureId: number): Promise<MatchEvent[]> {
  try {
    const res = await fetch(`${BASE}/fixtures/events?fixture=${fixtureId}`, {
      headers: headers(),
      next: { revalidate: 20 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response || [])
      .map((e: any): MatchEvent | null => {
        const type = classify(e);
        if (!type) return null;
        return {
          minute: (e.time?.elapsed ?? 0) + (e.time?.extra ?? 0),
          type,
          teamName: e.team?.name ?? "",
          player: e.player?.name ?? null,
          assist: e.assist?.name ?? null,
          detail: e.detail ?? "",
        };
      })
      .filter((e: MatchEvent | null): e is MatchEvent => e !== null)
      .sort((a: MatchEvent, b: MatchEvent) => a.minute - b.minute);
  } catch {
    return [];
  }
}

// Goal events for a fixture, in chronological order (used to name the scorer).
export async function getGoalEvents(fixtureId: number): Promise<GoalEvent[]> {
  try {
    const res = await fetch(`${BASE}/fixtures/events?fixture=${fixtureId}`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response || [])
      .filter((e: any) => e.type === "Goal" && e.detail !== "Missed Penalty")
      .map((e: any) => ({
        minute: (e.time?.elapsed ?? 0) + (e.time?.extra ?? 0),
        scorer: e.player?.name ?? "",
        assist: e.assist?.name ?? null,
        team: e.team?.name ?? "",
        detail: e.detail ?? "",
      }))
      .sort((a: GoalEvent, b: GoalEvent) => a.minute - b.minute);
  } catch {
    return [];
  }
}
