import { Match, StandingEntry, TeamInfo } from "./types";
import { getAllScores } from "./db";

// ─── Team names & flags ───────────────────────────────────────────────
const teamNames: Record<string, string> = {
  mex: "Mexico",
  ned: "Netherlands",
  can: "Canada",
  ukr: "Ukraine",
  arg: "Argentina",
  sau: "Saudi Arabia",
  uru: "Uruguay",
  sui: "Switzerland",
  fra: "France",
  qat: "Qatar",
  sen: "Senegal",
  per: "Peru",
  eng: "England",
  jpn: "Japan",
  den: "Denmark",
  egy: "Egypt",
  bra: "Brazil",
  aus: "Australia",
  ger: "Germany",
  alg: "Algeria",
  esp: "Spain",
  crc: "Costa Rica",
  cro: "Croatia",
  mar: "Morocco",
  por: "Portugal",
  nor: "Norway",
  bel: "Belgium",
  nga: "Nigeria",
  ita: "Italy",
  cze: "Czech Republic",
  col: "Colombia",
  kor: "South Korea",
  usa: "United States",
  mas: "Malaysia",
  pol: "Poland",
  chi: "Chile",
  cmr: "Cameroon",
  nzl: "New Zealand",
  par: "Paraguay",
  swe: "Sweden",
  ecu: "Ecuador",
  chn: "China",
  srb: "Serbia",
  tun: "Tunisia",
  civ: "Ivory Coast",
  ven: "Venezuela",
  aut: "Austria",
  gha: "Ghana",
};

// ─── Match schedule ───────────────────────────────────────────────────
// Edit scores here after matches finish.
// Format: [homeTeam, awayTeam, homeScore, awayScore]
// null means the match hasn't been played yet.
type ScoreInput = [string, string, number | null, number | null];

const matchInput: ScoreInput[] = [
  // Group A — Matchday 1
  ["mex", "ned", null, null],
  ["can", "ukr", null, null],
  ["arg", "sau", null, null],
  ["uru", "sui", null, null],
  // Group B — Matchday 1
  ["fra", "qat", null, null],
  ["sen", "per", null, null],
  ["eng", "jpn", null, null],
  ["den", "egy", null, null],
  // Group C — Matchday 1
  ["bra", "aus", null, null],
  ["ger", "alg", null, null],
  ["esp", "crc", null, null],
  ["cro", "mar", null, null],
  // Group D — Matchday 1
  ["por", "nor", null, null],
  ["bel", "nga", null, null],
  ["ita", "cze", null, null],
  ["col", "kor", null, null],
  // Group E — Matchday 1
  ["usa", "mas", null, null],
  ["pol", "chi", null, null],
  ["cmr", "nzl", null, null],
  ["par", "swe", null, null],
  // Group F — Matchday 1
  ["ecu", "chn", null, null],
  ["srb", "tun", null, null],
  ["civ", "ven", null, null],
  ["aut", "gha", null, null],
  // Group A — Matchday 2
  ["mex", "ukr", null, null],
  ["can", "ned", null, null],
  ["arg", "sui", null, null],
  ["uru", "sau", null, null],
  // Group B — Matchday 2
  ["fra", "per", null, null],
  ["sen", "qat", null, null],
  ["eng", "egy", null, null],
  ["den", "jpn", null, null],
  // Group C — Matchday 2
  ["bra", "alg", null, null],
  ["ger", "aus", null, null],
  ["esp", "mar", null, null],
  ["cro", "crc", null, null],
  // Group D — Matchday 2
  ["por", "nga", null, null],
  ["bel", "nor", null, null],
  ["ita", "kor", null, null],
  ["col", "cze", null, null],
  // Group E — Matchday 2
  ["usa", "chi", null, null],
  ["pol", "mas", null, null],
  ["cmr", "swe", null, null],
  ["par", "nzl", null, null],
  // Group F — Matchday 2
  ["ecu", "tun", null, null],
  ["srb", "chn", null, null],
  ["civ", "gha", null, null],
  ["aut", "ven", null, null],
  // Group A — Matchday 3
  ["can", "mex", null, null],
  ["ned", "ukr", null, null],
  ["arg", "uru", null, null],
  ["sui", "sau", null, null],
  // Group B — Matchday 3
  ["fra", "sen", null, null],
  ["per", "qat", null, null],
  ["eng", "den", null, null],
  ["jpn", "egy", null, null],
  // Group C — Matchday 3
  ["bra", "ger", null, null],
  ["aus", "alg", null, null],
  ["esp", "cro", null, null],
  ["mar", "crc", null, null],
  // Group D — Matchday 3
  ["por", "bel", null, null],
  ["nor", "nga", null, null],
  ["ita", "col", null, null],
  ["cze", "kor", null, null],
  // Group E — Matchday 3
  ["usa", "pol", null, null],
  ["chi", "mas", null, null],
  ["cmr", "par", null, null],
  ["swe", "nzl", null, null],
  // Group F — Matchday 3
  ["ecu", "srb", null, null],
  ["tun", "chn", null, null],
  ["civ", "aut", null, null],
  ["gha", "ven", null, null],
];

// ─── Match generation ─────────────────────────────────────────────────
const venues = [
  "Estadio Azteca", "BC Place", "MetLife Stadium", "SoFi Stadium",
  "AT&T Stadium", "Mercedes-Benz Stadium", "NRG Stadium", "Arrowhead Stadium",
  "Levi's Stadium", "Gillette Stadium", "Hard Rock Stadium", "Lumen Field",
  "Estadio BBVA", "Estadio Universitario", "Estadio Akron", "Allegiant Stadium",
  "M&T Bank Stadium", "GEHA Field at Arrowhead",
];

function getStage(index: number): string {
  if (index < 24) return `Group ${String.fromCharCode(65 + Math.floor(index / 3))}`;
  if (index < 48) return `Group ${String.fromCharCode(65 + Math.floor((index - 24) / 3))}`;
  return "Group A"; // shouldn't happen at 72 matches
}

function generateMatches(): Match[] {
  const kickoffDate = new Date("2026-06-11T13:00:00Z");
  return matchInput.map(([h, a, homeScore, awayScore], i) => {
    const date = new Date(kickoffDate);
    date.setDate(date.getDate() + Math.floor(i / 4));
    date.setHours(13 + (i % 4) * 3);

    const played = homeScore !== null && awayScore !== null;

    return {
      id: `${h}-${a}`,
      homeTeam: teamNames[h],
      awayTeam: teamNames[a],
      homeScore,
      awayScore,
      status: played ? "finished" : "upcoming",
      minute: null,
      date: date.toISOString().split("T")[0],
      time: date.toISOString().split("T")[1].slice(0, 5),
      venue: venues[i % venues.length],
      stage: getStage(i),
      homeFlag: h,
      awayFlag: a,
    };
  });
}

export const matches: Match[] = generateMatches();

export function getMatchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}

export function getMatchesByDate(date: string): Match[] {
  return matches.filter((m) => m.date === date);
}

export function getUpcomingMatches(limit?: number): Match[] {
  const upcoming = matches
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return limit ? upcoming.slice(0, limit) : upcoming;
}

export function getTodayMatches(): Match[] {
  const today = new Date().toISOString().split("T")[0];
  return getMatchesByDate(today);
}

// ─── Groups & teams ───────────────────────────────────────────────────
export const groups = [
  "Group A", "Group B", "Group C", "Group D",
  "Group E", "Group F", "Group G", "Group H",
];

const allTeamNames = Object.values(teamNames);
const uniqueTeams = [...new Set(allTeamNames)];

export const teams: TeamInfo[] = uniqueTeams.map((name, i) => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  group: groups[Math.floor(i / 6)],
  ranking: 200 - i,
}));

// ─── Standings (computed from match results) ──────────────────────────
export function computeStandings(): StandingEntry[] {
  const stats: Record<string, StandingEntry> = {};

  for (const name of uniqueTeams) {
    stats[name] = {
      pos: 0,
      team: name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    };
  }

  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue;

    const h = stats[m.homeTeam];
    const a = stats[m.awayTeam];
    h.played++;
    a.played++;
    h.gf += m.homeScore;
    h.ga += m.awayScore;
    a.gf += m.awayScore;
    a.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      h.won++;
      h.pts += 3;
      a.lost++;
    } else if (m.homeScore < m.awayScore) {
      a.won++;
      a.pts += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.pts++;
      a.pts++;
    }
  }

  for (const s of Object.values(stats)) {
    s.gd = s.gf - s.ga;
  }

  // Sort by pts > GD > GF, then assign position within group
  const sorted = Object.values(stats).sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  // Assign positions per group
  const groupMap: Record<string, StandingEntry[]> = {};
  for (const s of sorted) {
    const teamInfo = teams.find((t) => t.name === s.team);
    const g = teamInfo?.group ?? "Group A";
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(s);
  }

  for (const g of groups) {
    (groupMap[g] ?? []).forEach((s, i) => {
      s.pos = i + 1;
    });
  }

  return sorted;
}

export const standings: StandingEntry[] = computeStandings();

// ─── Build live match list from DB ───────────────────────────────────
function mapDbStatus(dbStatus: string): "upcoming" | "live" | "finished" {
  if (dbStatus === "FINISHED") return "finished";
  if (dbStatus === "IN_PLAY" || dbStatus === "PAUSED") return "live";
  return "upcoming";
}

function formatStage(groupName: string | null, stage: string | null): string {
  const s = groupName || stage || "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getMergedMatches(): Promise<Match[]> {
  try {
    const dbMatches = await getAllScores();
    if (dbMatches.length === 0) return matches;

    const knownMatches = dbMatches.filter(
      (db) => db.home_team !== "Unknown" && db.away_team !== "Unknown"
    );
    if (knownMatches.length === 0) return matches;

    return knownMatches.map((db) => {
      const [homeFlag = "", awayFlag = ""] = db.match_id.split("-");
      const utcDate = new Date(db.utc_date);
      return {
        id: String(db.api_id),
        homeTeam: db.home_team,
        awayTeam: db.away_team,
        homeScore: db.home_score,
        awayScore: db.away_score,
        status: mapDbStatus(db.status),
        minute: null,
        date: utcDate.toISOString().split("T")[0],
        time: utcDate.toISOString().split("T")[1].slice(0, 5),
        venue: "",
        stage: formatStage(db.group_name, db.stage),
        homeFlag,
        awayFlag,
      };
    });
  } catch {
    return matches;
  }
}
