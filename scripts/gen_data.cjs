// Generates src/lib/data.ts from the football-data.org API response
// Usage: node scripts/gen_data.cjs > src/lib/data.ts

const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/wujin/world-cup-2026/scripts/wc_data.json', 'utf8'));
const matches = d.matches;

// ─── Collect all teams ─────────────────────────────────────────────
const teams = {}; // tla -> { name, group }
for (const m of matches) {
  for (const side of ['homeTeam', 'awayTeam']) {
    const t = m[side];
    if (t && t.tla) {
      if (!teams[t.tla]) {
        teams[t.tla] = { name: t.name, group: m.group || '' };
      }
    }
  }
}

// ─── Generate teamNames mapping ────────────────────────────────────
function genTeamNames() {
  const entries = Object.entries(teams).sort((a, b) => a[0].localeCompare(b[0]));
  let out = 'const teamNames: Record<string, string> = {\n';
  for (const [tla, info] of entries) {
    out += `  ${tla.toLowerCase()}: "${info.name}",\n`;
  }
  out += '};\n';
  return out;
}

// ─── Generate groups ───────────────────────────────────────────────
function genGroups() {
  const groupMap = {};
  for (const [tla, info] of Object.entries(teams)) {
    const g = info.group;
    if (g) {
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push({ tla: tla.toLowerCase(), name: info.name });
    }
  }
  let out = 'export const groups: string[] = [\n';
  const keys = Object.keys(groupMap).sort();
  for (const g of keys) {
    out += `  "${g.replace('GROUP_', 'Group ')}",\n`;
  }
  out += '];\n\n';

  out += 'export const teams: TeamInfo[] = [\n';
  for (const g of keys) {
    for (const t of groupMap[g].sort((a, b) => a.tla.localeCompare(b.tla))) {
      out += `  { id: "${t.tla}", name: "${t.name}", group: "${g.replace('GROUP_', 'Group ')}", ranking: 0 },\n`;
    }
  }
  out += '];\n\n';
  return out;
}

// ─── Generate match input ──────────────────────────────────────────
function genMatches() {
  let out = 'const matchInput: ScoreInput[] = [\n';
  for (const m of matches) {
    const homeTla = m.homeTeam ? m.homeTeam.tla.toLowerCase() : 'tbd';
    const awayTla = m.awayTeam ? m.awayTeam.tla.toLowerCase() : 'tbd';
    const date = m.utcDate.slice(0, 10);
    const time = m.utcDate.slice(11, 16) + ':00Z';
    const group = m.group ? m.group.replace('GROUP_', 'Group ') : '';
    const stage = m.stage || 'GROUP_STAGE';
    const score = m.score && m.score.fullTime ? `${m.score.fullTime.home ?? 'null'}, ${m.score.fullTime.away ?? 'null'}` : 'null, null';
    out += `  // ${date} ${group ? group + ' ' : ''}${stage}\n`;
    out += `  ["${homeTla}", "${awayTla}", ${score}, "${date}", "${time}", "${stage}", "${group}", 0],\n`;
  }
  out += '];\n\n';
  return out;
}

// ─── Generate teams array with proper data ─────────────────────────
function genFullTeamList() {
  const groupMap = {};
  for (const [tla, info] of Object.entries(teams)) {
    const g = info.group;
    if (g) {
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push({ tla: tla.toLowerCase(), name: info.name });
    }
  }
  let out = 'export const teams: TeamInfo[] = [\n';
  const keys = Object.keys(groupMap).sort();
  for (const g of keys) {
    for (const t of groupMap[g].sort((a, b) => a.tla.localeCompare(b.tla))) {
      out += `  { id: "${t.tla}", name: "${t.name}", group: "${g.replace('GROUP_', 'Group ')}", ranking: 0 },\n`;
    }
  }
  out += '];\n\n';
  return out;
}

// ─── Generate standings (empty, all zeros) ─────────────────────────
function genStandings() {
  let out = 'export const standings: StandingEntry[] = [\n';

  const groupMap = {};
  for (const [tla, info] of Object.entries(teams)) {
    const g = info.group;
    if (g) {
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push({ tla: tla.toLowerCase(), name: info.name });
    }
  }

  const keys = Object.keys(groupMap).sort();
  let pos = 1;
  for (const g of keys) {
    for (const t of groupMap[g].sort((a, b) => a.tla.localeCompare(b.tla))) {
      out += `  { pos: ${pos}, team: "${t.name}", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 },\n`;
      pos++;
    }
  }
  out += '];\n\n';
  return out;
}

// ─── Generate matches array ────────────────────────────────────────
function genMatchesArray() {
  let out = 'export const matches: Match[] = [\n';
  for (const m of matches) {
    const homeTla = m.homeTeam ? m.homeTeam.tla.toLowerCase() : 'tbd';
    const awayTla = m.awayTeam ? m.awayTeam.tla.toLowerCase() : 'tbd';
    const date = m.utcDate.slice(0, 10);
    const time = m.utcDate.slice(11, 16) + ':00Z';
    const group = m.group ? m.group.replace('GROUP_', 'Group ') : '';
    const stage = m.stage || 'GROUP_STAGE';
    const homeScore = m.score && m.score.fullTime ? m.score.fullTime.home : null;
    const awayScore = m.score && m.score.fullTime ? m.score.fullTime.away : null;
    const homeName = m.homeTeam ? m.homeTeam.name : 'TBD';
    const awayName = m.awayTeam ? m.awayTeam.name : 'TBD';
    const status = m.status === 'TIMED' ? 'upcoming' : m.status === 'IN_PLAY' ? 'live' : m.status === 'FINISHED' ? 'finished' : 'upcoming';

    out += `  {\n`;
    out += `    id: "${homeTla}-${awayTla}",\n`;
    out += `    homeTeam: "${homeName}",\n`;
    out += `    awayTeam: "${awayName}",\n`;
    out += `    homeScore: ${homeScore},\n`;
    out += `    awayScore: ${awayScore},\n`;
    out += `    status: "${status}",\n`;
    out += `    minute: null,\n`;
    out += `    date: "${date}",\n`;
    out += `    time: "${time}",\n`;
    out += `    venue: "",\n`;
    out += `    stage: "${stage}",\n`;
    out += `  },\n`;
  }
  out += '];\n\n';
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────
console.log(`import { Match, StandingEntry, TeamInfo } from "./types";

// ─── Team names & flags ───────────────────────────────────────────────
${genTeamNames()}
// ─── Groups ───────────────────────────────────────────────────────────
export const groups: string[] = [
`);

const groupMap = {};
for (const [tla, info] of Object.entries(teams)) {
  const g = info.group;
  if (g) {
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push({ tla: tla.toLowerCase(), name: info.name });
  }
}
const keys = Object.keys(groupMap).sort();
for (const g of keys) {
  console.log(`  "${g.replace('GROUP_', 'Group ')}",`);
}
console.log(`];

// ─── Teams ────────────────────────────────────────────────────────────
export const teams: TeamInfo[] = [
`);
for (const g of keys) {
  for (const t of groupMap[g].sort((a, b) => a.tla.localeCompare(b.tla))) {
    console.log(`  { id: "${t.tla}", name: "${t.name}", group: "${g.replace('GROUP_', 'Group ')}", ranking: 0 },`);
  }
}
console.log(`];

// ─── Standings (initial, all zeros) ──────────────────────────────────
export const standings: StandingEntry[] = [
`);
let pos = 1;
for (const g of keys) {
  for (const t of groupMap[g].sort((a, b) => a.tla.localeCompare(b.tla))) {
    console.log(`  { pos: ${pos}, team: "${t.name}", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 },`);
    pos++;
  }
}
console.log(`];

// ─── Match schedule ──────────────────────────────────────────────────
// Format: [homeTeam, awayTeam, homeScore, awayScore, date, time, stage, group, venueIndex]
type ScoreInput = [string, string, number | null, number | null, string, string, string, string, number];

const matchInput: ScoreInput[] = [
`);
for (const m of matches) {
  const homeTla = m.homeTeam && m.homeTeam.tla ? m.homeTeam.tla.toLowerCase() : 'tbd';
  const awayTla = m.awayTeam && m.awayTeam.tla ? m.awayTeam.tla.toLowerCase() : 'tbd';
  const date = m.utcDate.slice(0, 10);
  const time = m.utcDate.slice(11, 16) + ':00Z';
  const group = m.group ? m.group.replace('GROUP_', 'Group ') : '';
  const stage = m.stage || 'GROUP_STAGE';
  const homeScore = m.score && m.score.fullTime ? m.score.fullTime.home : null;
  const awayScore = m.score && m.score.fullTime ? m.score.fullTime.away : null;
  const stageLabel = stage === 'GROUP_STAGE' ? '' : stage + ' ';
  console.log(`  // ${date} ${stageLabel}${group ? '(' + group + ')' : ''}`);
  console.log(`  ["${homeTla}", "${awayTla}", ${homeScore}, ${awayScore}, "${date}", "${time}", "${stage}", "${group}", 0],`);
}
console.log(`];

// ─── Generated matches array ─────────────────────────────────────────
export const matches: Match[] = [
`);
for (const m of matches) {
  const homeTla = m.homeTeam && m.homeTeam.tla ? m.homeTeam.tla.toLowerCase() : 'tbd';
  const awayTla = m.awayTeam && m.awayTeam.tla ? m.awayTeam.tla.toLowerCase() : 'tbd';
  const date = m.utcDate.slice(0, 10);
  const time = m.utcDate.slice(11, 16) + ':00Z';
  const group = m.group ? m.group.replace('GROUP_', 'Group ') : '';
  const stage = m.stage || 'GROUP_STAGE';
  const homeScore = m.score && m.score.fullTime ? m.score.fullTime.home : null;
  const awayScore = m.score && m.score.fullTime ? m.score.fullTime.away : null;
  const homeName = m.homeTeam && m.homeTeam.name ? m.homeTeam.name : 'TBD';
  const awayName = m.awayTeam && m.awayTeam.name ? m.awayTeam.name : 'TBD';
  const status = m.status === 'TIMED' ? 'upcoming' : m.status === 'IN_PLAY' ? 'live' : m.status === 'FINISHED' ? 'finished' : 'upcoming';

  console.log(`  {
    id: "${homeTla}-${awayTla}",
    homeTeam: "${homeName}",
    awayTeam: "${awayName}",
    homeScore: ${homeScore},
    awayScore: ${awayScore},
    status: "${status}",
    minute: null,
    date: "${date}",
    time: "${time}",
    venue: "",
    stage: "${stage}",
  },`);
}
console.log(`];

// ─── Helper functions ────────────────────────────────────────────────
function buildMatch(input: ScoreInput): Match {
  const [homeTla, awayTla, homeScore, awayScore, date, time, stage, group] = input;
  const homeName = teamNames[homeTla] ?? homeTla;
  const awayName = teamNames[awayTla] ?? awayTla;
  const now = new Date();
  const matchDate = new Date(date + "T" + time);
  const isLive = now >= matchDate && now < new Date(matchDate.getTime() + 120 * 60000);
  const isFinished = now >= new Date(matchDate.getTime() + 120 * 60000);

  return {
    id: homeTla + "-" + awayTla,
    homeTeam: homeName,
    awayTeam: awayName,
    homeScore,
    awayScore,
    status: isFinished ? "finished" : isLive ? "live" : "upcoming",
    minute: null,
    date,
    time,
    venue: "",
    stage: stage || "GROUP_STAGE",
  };
}

export function getMatchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}

export function getMatchesByDate(date: string): Match[] {
  return matches.filter((m) => m.date === date);
}

export function getTodayMatches(): Match[] {
  const today = new Date().toISOString().slice(0, 10);
  return matches.filter((m) => m.date === today);
}

export function getUpcomingMatches(limit: number = 6): Match[] {
  const now = new Date();
  return matches
    .filter((m) => new Date(m.date + "T" + m.time) > now)
    .slice(0, limit);
}
`);
