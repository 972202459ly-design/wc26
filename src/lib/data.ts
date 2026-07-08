import { Match, StandingEntry, TeamInfo } from "./types";
import type { SyncedMatch } from "./db";

// ─── Amazon Associates ─────────────────────────────────────────────────
export const AMAZON_TAG = "none03e04-20";

/** Generate an Amazon search affiliate link */
export function amazonSearchLink(keywords: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}&tag=${AMAZON_TAG}`;
}

// ─── Team names & flags ───────────────────────────────────────────────
const teamNames: Record<string, string> = {
  alg: "Algeria",
  arg: "Argentina",
  aus: "Australia",
  aut: "Austria",
  bel: "Belgium",
  bih: "Bosnia-Herzegovina",
  bra: "Brazil",
  can: "Canada",
  civ: "Ivory Coast",
  cod: "Congo DR",
  col: "Colombia",
  cpv: "Cape Verde Islands",
  cro: "Croatia",
  cuw: "Curaçao",
  cze: "Czechia",
  ecu: "Ecuador",
  egy: "Egypt",
  eng: "England",
  esp: "Spain",
  fra: "France",
  ger: "Germany",
  gha: "Ghana",
  hai: "Haiti",
  irn: "Iran",
  irq: "Iraq",
  jor: "Jordan",
  jpn: "Japan",
  kor: "South Korea",
  ksa: "Saudi Arabia",
  mar: "Morocco",
  mex: "Mexico",
  ned: "Netherlands",
  nor: "Norway",
  nzl: "New Zealand",
  pan: "Panama",
  par: "Paraguay",
  por: "Portugal",
  qat: "Qatar",
  rsa: "South Africa",
  sco: "Scotland",
  sen: "Senegal",
  sui: "Switzerland",
  swe: "Sweden",
  tun: "Tunisia",
  tur: "Turkey",
  ury: "Uruguay",
  usa: "United States",
  uzb: "Uzbekistan",
};

// ─── FIFA 3-letter → ISO 2-letter mapping (for flag CDN) ─────────────
const fifaToIso2: Record<string, string> = {
  alg: "dz", arg: "ar", aus: "au", aut: "at", bel: "be", bih: "ba",
  bra: "br", can: "ca", civ: "ci", cod: "cd", col: "co", cpv: "cv",
  cro: "hr", cuw: "cw", cze: "cz", ecu: "ec", egy: "eg", eng: "gb",
  esp: "es", fra: "fr", ger: "de", gha: "gh", hai: "ht", irn: "ir",
  irq: "iq", jor: "jo", jpn: "jp", kor: "kr", ksa: "sa", mar: "ma",
  mex: "mx", ned: "nl", nor: "no", nzl: "nz", pan: "pa", par: "py",
  por: "pt", qat: "qa", rsa: "za", sco: "gb", sen: "sn", sui: "ch",
  swe: "se", tun: "tn", tur: "tr", ury: "uy", usa: "us", uzb: "uz",
};

export function getTeamFlagUrl(id: string): string {
  const iso2 = fifaToIso2[id];
  if (!iso2) return "";
  return `https://flagcdn.com/24x18/${iso2}.png`;
}

export function getTeamFlagUrlBig(id: string): string {
  const iso2 = fifaToIso2[id];
  if (!iso2) return "";
  return `https://flagcdn.com/32x24/${iso2}.png`;
}

export function getTeamIdByName(name: string): string | undefined {
  return tlaFromName(name);
}

// Representative competitors for tournament-level SportsEvent JSON-LD — supplies
// the recommended `performer` field for Google Event rich results.
export const eventPerformers = [
  "Argentina", "Brazil", "France", "England", "Spain", "Germany",
  "Portugal", "Netherlands", "United States", "Mexico", "Canada", "Morocco",
].map((name) => ({ "@type": "SportsTeam", name }));

// Map an external (API-Football) team name to our static TLA so DB match_ids
// stay consistent with the site's static match pages. Normalizes punctuation/
// accents and covers known FIFA naming differences.
function normTeam(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}
const TEAM_NAME_ALIASES: Record<string, string> = {
  korearepublic: "kor",
  korea: "kor",
  cotedivoire: "civ",
  turkiye: "tur",
  capeverde: "cpv",
  usa: "usa",
  unitedstatesofamerica: "usa",
  irislamicrepublicofiran: "irn",
  iran: "irn",
  czechrepublic: "cze",
};
const NORM_NAME_TO_TLA: Record<string, string> = Object.fromEntries(
  Object.entries(teamNames).map(([tla, name]) => [normTeam(name), tla])
);
export function tlaFromName(name: string): string | undefined {
  const n = normTeam(name);
  return TEAM_NAME_ALIASES[n] ?? NORM_NAME_TO_TLA[n];
}

// ─── Groups ───────────────────────────────────────────────────────────
export const groups: string[] = [
  "Group A", "Group B", "Group C", "Group D",
  "Group E", "Group F", "Group G", "Group H",
  "Group I", "Group J", "Group K", "Group L",
];

// ─── Teams ────────────────────────────────────────────────────────────
export const teams: TeamInfo[] = [
  { id: "cze", name: "Czechia", group: "Group A", ranking: 0 },
  { id: "kor", name: "South Korea", group: "Group A", ranking: 0 },
  { id: "mex", name: "Mexico", group: "Group A", ranking: 0 },
  { id: "rsa", name: "South Africa", group: "Group A", ranking: 0 },
  { id: "bih", name: "Bosnia-Herzegovina", group: "Group B", ranking: 0 },
  { id: "can", name: "Canada", group: "Group B", ranking: 0 },
  { id: "qat", name: "Qatar", group: "Group B", ranking: 0 },
  { id: "sui", name: "Switzerland", group: "Group B", ranking: 0 },
  { id: "bra", name: "Brazil", group: "Group C", ranking: 0 },
  { id: "hai", name: "Haiti", group: "Group C", ranking: 0 },
  { id: "mar", name: "Morocco", group: "Group C", ranking: 0 },
  { id: "sco", name: "Scotland", group: "Group C", ranking: 0 },
  { id: "aus", name: "Australia", group: "Group D", ranking: 0 },
  { id: "par", name: "Paraguay", group: "Group D", ranking: 0 },
  { id: "tur", name: "Turkey", group: "Group D", ranking: 0 },
  { id: "usa", name: "United States", group: "Group D", ranking: 0 },
  { id: "civ", name: "Ivory Coast", group: "Group E", ranking: 0 },
  { id: "cuw", name: "Curaçao", group: "Group E", ranking: 0 },
  { id: "ecu", name: "Ecuador", group: "Group E", ranking: 0 },
  { id: "ger", name: "Germany", group: "Group E", ranking: 0 },
  { id: "jpn", name: "Japan", group: "Group F", ranking: 0 },
  { id: "ned", name: "Netherlands", group: "Group F", ranking: 0 },
  { id: "swe", name: "Sweden", group: "Group F", ranking: 0 },
  { id: "tun", name: "Tunisia", group: "Group F", ranking: 0 },
  { id: "bel", name: "Belgium", group: "Group G", ranking: 0 },
  { id: "egy", name: "Egypt", group: "Group G", ranking: 0 },
  { id: "irn", name: "Iran", group: "Group G", ranking: 0 },
  { id: "nzl", name: "New Zealand", group: "Group G", ranking: 0 },
  { id: "cpv", name: "Cape Verde Islands", group: "Group H", ranking: 0 },
  { id: "esp", name: "Spain", group: "Group H", ranking: 0 },
  { id: "ksa", name: "Saudi Arabia", group: "Group H", ranking: 0 },
  { id: "ury", name: "Uruguay", group: "Group H", ranking: 0 },
  { id: "fra", name: "France", group: "Group I", ranking: 0 },
  { id: "irq", name: "Iraq", group: "Group I", ranking: 0 },
  { id: "nor", name: "Norway", group: "Group I", ranking: 0 },
  { id: "sen", name: "Senegal", group: "Group I", ranking: 0 },
  { id: "alg", name: "Algeria", group: "Group J", ranking: 0 },
  { id: "arg", name: "Argentina", group: "Group J", ranking: 0 },
  { id: "aut", name: "Austria", group: "Group J", ranking: 0 },
  { id: "jor", name: "Jordan", group: "Group J", ranking: 0 },
  { id: "cod", name: "Congo DR", group: "Group K", ranking: 0 },
  { id: "col", name: "Colombia", group: "Group K", ranking: 0 },
  { id: "por", name: "Portugal", group: "Group K", ranking: 0 },
  { id: "uzb", name: "Uzbekistan", group: "Group K", ranking: 0 },
  { id: "cro", name: "Croatia", group: "Group L", ranking: 0 },
  { id: "eng", name: "England", group: "Group L", ranking: 0 },
  { id: "gha", name: "Ghana", group: "Group L", ranking: 0 },
  { id: "pan", name: "Panama", group: "Group L", ranking: 0 },
];

// ─── Standings (generated from teams) ──────────────────────────────────
export const standings: StandingEntry[] = teams.map((t, i) => ({
  pos: i + 1,
  team: t.name,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  gf: 0,
  ga: 0,
  gd: 0,
  pts: 0,
}));

// ─── Match schedule ──────────────────────────────────────────────────
// Format: [homeTeam, awayTeam, homeScore, awayScore, date, time, stage, group, venueIndex]
type ScoreInput = [string, string, number | null, number | null, string, string, string, string, number];

const matchInput: ScoreInput[] = [
  // 2026-06-11 (Group A)
  ["mex", "rsa", null, null, "2026-06-11", "19:00:00Z", "GROUP_STAGE", "Group A", 0],
  // 2026-06-12 (Group A)
  ["kor", "cze", null, null, "2026-06-12", "02:00:00Z", "GROUP_STAGE", "Group A", 0],
  // 2026-06-12 (Group B)
  ["can", "bih", null, null, "2026-06-12", "19:00:00Z", "GROUP_STAGE", "Group B", 0],
  // 2026-06-13 (Group D)
  ["usa", "par", null, null, "2026-06-13", "01:00:00Z", "GROUP_STAGE", "Group D", 0],
  // 2026-06-13 (Group B)
  ["qat", "sui", null, null, "2026-06-13", "19:00:00Z", "GROUP_STAGE", "Group B", 0],
  // 2026-06-13 (Group C)
  ["bra", "mar", null, null, "2026-06-13", "22:00:00Z", "GROUP_STAGE", "Group C", 0],
  // 2026-06-14 (Group C)
  ["hai", "sco", null, null, "2026-06-14", "01:00:00Z", "GROUP_STAGE", "Group C", 0],
  // 2026-06-14 (Group D)
  ["aus", "tur", null, null, "2026-06-14", "04:00:00Z", "GROUP_STAGE", "Group D", 0],
  // 2026-06-14 (Group E)
  ["ger", "cuw", null, null, "2026-06-14", "17:00:00Z", "GROUP_STAGE", "Group E", 0],
  // 2026-06-14 (Group F)
  ["ned", "jpn", null, null, "2026-06-14", "20:00:00Z", "GROUP_STAGE", "Group F", 0],
  // 2026-06-14 (Group E)
  ["civ", "ecu", null, null, "2026-06-14", "23:00:00Z", "GROUP_STAGE", "Group E", 0],
  // 2026-06-15 (Group F)
  ["swe", "tun", null, null, "2026-06-15", "02:00:00Z", "GROUP_STAGE", "Group F", 0],
  // 2026-06-15 (Group H)
  ["esp", "cpv", null, null, "2026-06-15", "16:00:00Z", "GROUP_STAGE", "Group H", 0],
  // 2026-06-15 (Group G)
  ["bel", "egy", null, null, "2026-06-15", "19:00:00Z", "GROUP_STAGE", "Group G", 0],
  // 2026-06-15 (Group H)
  ["ksa", "ury", null, null, "2026-06-15", "22:00:00Z", "GROUP_STAGE", "Group H", 0],
  // 2026-06-16 (Group G)
  ["irn", "nzl", null, null, "2026-06-16", "01:00:00Z", "GROUP_STAGE", "Group G", 0],
  // 2026-06-16 (Group I)
  ["fra", "sen", null, null, "2026-06-16", "19:00:00Z", "GROUP_STAGE", "Group I", 0],
  // 2026-06-16 (Group I)
  ["irq", "nor", null, null, "2026-06-16", "22:00:00Z", "GROUP_STAGE", "Group I", 0],
  // 2026-06-17 (Group J)
  ["arg", "alg", null, null, "2026-06-17", "01:00:00Z", "GROUP_STAGE", "Group J", 0],
  // 2026-06-17 (Group J)
  ["aut", "jor", null, null, "2026-06-17", "04:00:00Z", "GROUP_STAGE", "Group J", 0],
  // 2026-06-17 (Group K)
  ["por", "cod", null, null, "2026-06-17", "17:00:00Z", "GROUP_STAGE", "Group K", 0],
  // 2026-06-17 (Group L)
  ["eng", "cro", null, null, "2026-06-17", "20:00:00Z", "GROUP_STAGE", "Group L", 0],
  // 2026-06-17 (Group L)
  ["gha", "pan", null, null, "2026-06-17", "23:00:00Z", "GROUP_STAGE", "Group L", 0],
  // 2026-06-18 (Group K)
  ["uzb", "col", null, null, "2026-06-18", "02:00:00Z", "GROUP_STAGE", "Group K", 0],
  // 2026-06-18 (Group A)
  ["cze", "rsa", null, null, "2026-06-18", "16:00:00Z", "GROUP_STAGE", "Group A", 0],
  // 2026-06-18 (Group B)
  ["sui", "bih", null, null, "2026-06-18", "19:00:00Z", "GROUP_STAGE", "Group B", 0],
  // 2026-06-18 (Group B)
  ["can", "qat", null, null, "2026-06-18", "22:00:00Z", "GROUP_STAGE", "Group B", 0],
  // 2026-06-19 (Group A)
  ["mex", "kor", null, null, "2026-06-19", "01:00:00Z", "GROUP_STAGE", "Group A", 0],
  // 2026-06-19 (Group D)
  ["usa", "aus", null, null, "2026-06-19", "19:00:00Z", "GROUP_STAGE", "Group D", 0],
  // 2026-06-19 (Group C)
  ["sco", "mar", null, null, "2026-06-19", "22:00:00Z", "GROUP_STAGE", "Group C", 0],
  // 2026-06-20 (Group C)
  ["bra", "hai", null, null, "2026-06-20", "00:30:00Z", "GROUP_STAGE", "Group C", 0],
  // 2026-06-20 (Group D)
  ["tur", "par", null, null, "2026-06-20", "03:00:00Z", "GROUP_STAGE", "Group D", 0],
  // 2026-06-20 (Group F)
  ["ned", "swe", null, null, "2026-06-20", "17:00:00Z", "GROUP_STAGE", "Group F", 0],
  // 2026-06-20 (Group E)
  ["ger", "civ", null, null, "2026-06-20", "20:00:00Z", "GROUP_STAGE", "Group E", 0],
  // 2026-06-21 (Group E)
  ["ecu", "cuw", null, null, "2026-06-21", "00:00:00Z", "GROUP_STAGE", "Group E", 0],
  // 2026-06-21 (Group F)
  ["tun", "jpn", null, null, "2026-06-21", "04:00:00Z", "GROUP_STAGE", "Group F", 0],
  // 2026-06-21 (Group H)
  ["esp", "ksa", null, null, "2026-06-21", "16:00:00Z", "GROUP_STAGE", "Group H", 0],
  // 2026-06-21 (Group G)
  ["bel", "irn", null, null, "2026-06-21", "19:00:00Z", "GROUP_STAGE", "Group G", 0],
  // 2026-06-21 (Group H)
  ["ury", "cpv", null, null, "2026-06-21", "22:00:00Z", "GROUP_STAGE", "Group H", 0],
  // 2026-06-22 (Group G)
  ["nzl", "egy", null, null, "2026-06-22", "01:00:00Z", "GROUP_STAGE", "Group G", 0],
  // 2026-06-22 (Group J)
  ["arg", "aut", null, null, "2026-06-22", "17:00:00Z", "GROUP_STAGE", "Group J", 0],
  // 2026-06-22 (Group I)
  ["fra", "irq", null, null, "2026-06-22", "21:00:00Z", "GROUP_STAGE", "Group I", 0],
  // 2026-06-23 (Group I)
  ["nor", "sen", null, null, "2026-06-23", "00:00:00Z", "GROUP_STAGE", "Group I", 0],
  // 2026-06-23 (Group J)
  ["jor", "alg", null, null, "2026-06-23", "03:00:00Z", "GROUP_STAGE", "Group J", 0],
  // 2026-06-23 (Group K)
  ["por", "uzb", null, null, "2026-06-23", "17:00:00Z", "GROUP_STAGE", "Group K", 0],
  // 2026-06-23 (Group L)
  ["eng", "gha", null, null, "2026-06-23", "20:00:00Z", "GROUP_STAGE", "Group L", 0],
  // 2026-06-23 (Group L)
  ["pan", "cro", null, null, "2026-06-23", "23:00:00Z", "GROUP_STAGE", "Group L", 0],
  // 2026-06-24 (Group K)
  ["col", "cod", null, null, "2026-06-24", "02:00:00Z", "GROUP_STAGE", "Group K", 0],
  // 2026-06-24 (Group B)
  ["sui", "can", null, null, "2026-06-24", "19:00:00Z", "GROUP_STAGE", "Group B", 0],
  // 2026-06-24 (Group B)
  ["bih", "qat", null, null, "2026-06-24", "19:00:00Z", "GROUP_STAGE", "Group B", 0],
  // 2026-06-24 (Group C)
  ["mar", "hai", null, null, "2026-06-24", "22:00:00Z", "GROUP_STAGE", "Group C", 0],
  // 2026-06-24 (Group C)
  ["sco", "bra", null, null, "2026-06-24", "22:00:00Z", "GROUP_STAGE", "Group C", 0],
  // 2026-06-25 (Group A)
  ["cze", "mex", null, null, "2026-06-25", "01:00:00Z", "GROUP_STAGE", "Group A", 0],
  // 2026-06-25 (Group A)
  ["rsa", "kor", null, null, "2026-06-25", "01:00:00Z", "GROUP_STAGE", "Group A", 0],
  // 2026-06-25 (Group E)
  ["ecu", "ger", null, null, "2026-06-25", "20:00:00Z", "GROUP_STAGE", "Group E", 0],
  // 2026-06-25 (Group E)
  ["cuw", "civ", null, null, "2026-06-25", "20:00:00Z", "GROUP_STAGE", "Group E", 0],
  // 2026-06-25 (Group F)
  ["tun", "ned", null, null, "2026-06-25", "23:00:00Z", "GROUP_STAGE", "Group F", 0],
  // 2026-06-25 (Group F)
  ["jpn", "swe", null, null, "2026-06-25", "23:00:00Z", "GROUP_STAGE", "Group F", 0],
  // 2026-06-26 (Group D)
  ["tur", "usa", null, null, "2026-06-26", "02:00:00Z", "GROUP_STAGE", "Group D", 0],
  // 2026-06-26 (Group D)
  ["par", "aus", null, null, "2026-06-26", "02:00:00Z", "GROUP_STAGE", "Group D", 0],
  // 2026-06-26 (Group I)
  ["nor", "fra", null, null, "2026-06-26", "19:00:00Z", "GROUP_STAGE", "Group I", 0],
  // 2026-06-26 (Group I)
  ["sen", "irq", null, null, "2026-06-26", "19:00:00Z", "GROUP_STAGE", "Group I", 0],
  // 2026-06-27 (Group H)
  ["ury", "esp", null, null, "2026-06-27", "00:00:00Z", "GROUP_STAGE", "Group H", 0],
  // 2026-06-27 (Group H)
  ["cpv", "ksa", null, null, "2026-06-27", "00:00:00Z", "GROUP_STAGE", "Group H", 0],
  // 2026-06-27 (Group G)
  ["nzl", "bel", null, null, "2026-06-27", "03:00:00Z", "GROUP_STAGE", "Group G", 0],
  // 2026-06-27 (Group G)
  ["egy", "irn", null, null, "2026-06-27", "03:00:00Z", "GROUP_STAGE", "Group G", 0],
  // 2026-06-27 (Group L)
  ["pan", "eng", null, null, "2026-06-27", "21:00:00Z", "GROUP_STAGE", "Group L", 0],
  // 2026-06-27 (Group L)
  ["cro", "gha", null, null, "2026-06-27", "21:00:00Z", "GROUP_STAGE", "Group L", 0],
  // 2026-06-27 (Group K)
  ["col", "por", null, null, "2026-06-27", "23:30:00Z", "GROUP_STAGE", "Group K", 0],
  // 2026-06-27 (Group K)
  ["cod", "uzb", null, null, "2026-06-27", "23:30:00Z", "GROUP_STAGE", "Group K", 0],
  // 2026-06-28 (Group J)
  ["jor", "arg", null, null, "2026-06-28", "02:00:00Z", "GROUP_STAGE", "Group J", 0],
  // 2026-06-28 (Group J)
  ["alg", "aut", null, null, "2026-06-28", "02:00:00Z", "GROUP_STAGE", "Group J", 0],
  // 2026-06-28 LAST_32
  ["tbd", "tbd", null, null, "2026-06-28", "19:00:00Z", "LAST_32", "", 0],
  // 2026-06-29 LAST_32
  ["tbd", "tbd", null, null, "2026-06-29", "17:00:00Z", "LAST_32", "", 0],
  // 2026-06-29 LAST_32
  ["tbd", "tbd", null, null, "2026-06-29", "20:30:00Z", "LAST_32", "", 0],
  // 2026-06-30 LAST_32
  ["tbd", "tbd", null, null, "2026-06-30", "01:00:00Z", "LAST_32", "", 0],
  // 2026-06-30 LAST_32
  ["tbd", "tbd", null, null, "2026-06-30", "17:00:00Z", "LAST_32", "", 0],
  // 2026-06-30 LAST_32
  ["tbd", "tbd", null, null, "2026-06-30", "21:00:00Z", "LAST_32", "", 0],
  // 2026-07-01 LAST_32
  ["tbd", "tbd", null, null, "2026-07-01", "01:00:00Z", "LAST_32", "", 0],
  // 2026-07-01 LAST_32
  ["tbd", "tbd", null, null, "2026-07-01", "16:00:00Z", "LAST_32", "", 0],
  // 2026-07-01 LAST_32
  ["tbd", "tbd", null, null, "2026-07-01", "20:00:00Z", "LAST_32", "", 0],
  // 2026-07-02 LAST_32
  ["tbd", "tbd", null, null, "2026-07-02", "00:00:00Z", "LAST_32", "", 0],
  // 2026-07-02 LAST_32
  ["tbd", "tbd", null, null, "2026-07-02", "19:00:00Z", "LAST_32", "", 0],
  // 2026-07-02 LAST_32
  ["tbd", "tbd", null, null, "2026-07-02", "23:00:00Z", "LAST_32", "", 0],
  // 2026-07-03 LAST_32
  ["tbd", "tbd", null, null, "2026-07-03", "03:00:00Z", "LAST_32", "", 0],
  // 2026-07-03 LAST_32
  ["tbd", "tbd", null, null, "2026-07-03", "18:00:00Z", "LAST_32", "", 0],
  // 2026-07-03 LAST_32
  ["tbd", "tbd", null, null, "2026-07-03", "22:00:00Z", "LAST_32", "", 0],
  // 2026-07-04 LAST_32
  ["tbd", "tbd", null, null, "2026-07-04", "01:30:00Z", "LAST_32", "", 0],
  // 2026-07-04 LAST_16
  ["tbd", "tbd", null, null, "2026-07-04", "17:00:00Z", "LAST_16", "", 0],
  // 2026-07-04 LAST_16
  ["tbd", "tbd", null, null, "2026-07-04", "21:00:00Z", "LAST_16", "", 0],
  // 2026-07-05 LAST_16
  ["tbd", "tbd", null, null, "2026-07-05", "20:00:00Z", "LAST_16", "", 0],
  // 2026-07-06 LAST_16
  ["tbd", "tbd", null, null, "2026-07-06", "00:00:00Z", "LAST_16", "", 0],
  // 2026-07-06 LAST_16
  ["tbd", "tbd", null, null, "2026-07-06", "19:00:00Z", "LAST_16", "", 0],
  // 2026-07-07 LAST_16
  ["tbd", "tbd", null, null, "2026-07-07", "00:00:00Z", "LAST_16", "", 0],
  // 2026-07-07 LAST_16
  ["tbd", "tbd", null, null, "2026-07-07", "16:00:00Z", "LAST_16", "", 0],
  // 2026-07-07 LAST_16
  ["tbd", "tbd", null, null, "2026-07-07", "20:00:00Z", "LAST_16", "", 0],
  // 2026-07-09 QUARTER_FINALS
  ["tbd", "tbd", null, null, "2026-07-09", "20:00:00Z", "QUARTER_FINALS", "", 0],
  // 2026-07-10 QUARTER_FINALS
  ["tbd", "tbd", null, null, "2026-07-10", "19:00:00Z", "QUARTER_FINALS", "", 0],
  // 2026-07-11 QUARTER_FINALS
  ["tbd", "tbd", null, null, "2026-07-11", "21:00:00Z", "QUARTER_FINALS", "", 0],
  // 2026-07-12 QUARTER_FINALS
  ["tbd", "tbd", null, null, "2026-07-12", "01:00:00Z", "QUARTER_FINALS", "", 0],
  // 2026-07-14 SEMI_FINALS
  ["tbd", "tbd", null, null, "2026-07-14", "19:00:00Z", "SEMI_FINALS", "", 0],
  // 2026-07-15 SEMI_FINALS
  ["tbd", "tbd", null, null, "2026-07-15", "19:00:00Z", "SEMI_FINALS", "", 0],
  // 2026-07-18 THIRD_PLACE
  ["tbd", "tbd", null, null, "2026-07-18", "21:00:00Z", "THIRD_PLACE", "", 0],
  // 2026-07-19 FINAL
  ["tbd", "tbd", null, null, "2026-07-19", "19:00:00Z", "FINAL", "", 0],
];

// ─── Match generation ─────────────────────────────────────────────────
function generateMatches(input: typeof matchInput): Match[] {
  const koCounters: Record<string, number> = {};

  return input.map((entry) => {
    const [homeTla, awayTla, homeScore, awayScore, date, time, stage, group] = entry;
    const homeName = teamNames[homeTla] ?? homeTla;
    const awayName = teamNames[awayTla] ?? awayTla;
    const now = new Date();
    const matchDate = new Date(date + "T" + time);
    const isLive = now >= matchDate && now < new Date(matchDate.getTime() + 120 * 60000);
    const isFinished = now >= new Date(matchDate.getTime() + 120 * 60000);

    // Group stage uses team codes as ID; KO stage uses ko-{stage}-{n}
    const isKo = homeTla === "tbd" || awayTla === "tbd";
    const id = isKo
      ? (() => {
          const key = stage.toLowerCase();
          koCounters[key] = (koCounters[key] ?? 0) + 1;
          return `ko-${key}-${koCounters[key]}`;
        })()
      : `${homeTla}-${awayTla}`;

    return {
      id,
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
  });
}

export const matches: Match[] = generateMatches(matchInput);

// ─── Helper functions ────────────────────────────────────────────────
export function getMatchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}

// Server-side merge of static match with live DB score (for SSR/metadata).
// Falls back to static data if the DB is unavailable (e.g. at build time).
export async function getMatchByIdWithScore(id: string): Promise<Match | undefined> {
  const base = getMatchById(id);
  try {
    const { getAllScores } = await import("./db");
    const live = (await getAllScores()).find((s) => s.match_id === id);
    // Knockout fixtures aren't in the static skeleton (their teams weren't known
    // at build time), so when there's no static base, serve the fixture straight
    // from the DB instead of 404ing.
    if (!base) return live ? dbRowToMatch(live) : undefined;
    if (!live) return base;
    return {
      ...base,
      homeScore: live.home_score ?? base.homeScore,
      awayScore: live.away_score ?? base.awayScore,
      homePenaltyScore: live.home_penalty_score ?? null,
      awayPenaltyScore: live.away_penalty_score ?? null,
      winner: live.winner ?? null,
      status:
        live.status === "FINISHED"
          ? "finished"
          : live.status === "IN_PLAY" || live.status === "PAUSED"
            ? "live"
            : base.status,
      stage: live.stage ?? base.stage,
    };
  } catch {
    const live = (await getApiFootballScoreRows()).find((s) => s.match_id === id);
    if (!base) return live ? dbRowToMatch(live) : undefined;
    if (!live) return base;
    return {
      ...base,
      homeScore: live.home_score ?? base.homeScore,
      awayScore: live.away_score ?? base.awayScore,
      homePenaltyScore: live.home_penalty_score ?? null,
      awayPenaltyScore: live.away_penalty_score ?? null,
      winner: live.winner ?? null,
      status:
        live.status === "FINISHED"
          ? "finished"
          : live.status === "IN_PLAY" || live.status === "PAUSED"
            ? "live"
            : base.status,
      stage: live.stage ?? base.stage,
    };
  }
}

/** Build a Match from a DB fixture row — used for fixtures that exist only in
 *  the DB (real knockout matchups whose teams weren't known at build time). */
function dbRowToMatch(s: SyncedMatch, now: Date = new Date()): Match {
  const ko = new Date(s.utc_date);
  const date = ko.toISOString().slice(0, 10);
  const time = ko.toISOString().slice(11, 19) + "Z"; // matches static "HH:MM:SSZ" UTC convention
  const status: Match["status"] =
    s.status === "FINISHED"
      ? "finished"
      : s.status === "IN_PLAY" || s.status === "PAUSED"
        ? "live"
        : liveStatus({ date, time } as Match, now);
  return {
    id: s.match_id,
    homeTeam: s.home_team,
    awayTeam: s.away_team,
    homeScore: s.home_score,
    awayScore: s.away_score,
    homePenaltyScore: s.home_penalty_score ?? null,
    awayPenaltyScore: s.away_penalty_score ?? null,
    winner: s.winner ?? null,
    status,
    minute: null,
    date,
    time,
    venue: "",
    stage: s.stage ?? "GROUP_STAGE",
  };
}

async function getApiFootballScoreRows(): Promise<SyncedMatch[]> {
  if (process.env.NEXT_PHASE === "phase-production-build") return [];
  try {
    const { getWorldCupFixtures } = await import("./apifootball");
    return (await getWorldCupFixtures()).map((f) => f.synced);
  } catch (err) {
    console.error("API-Football score fallback error:", err);
    return [];
  }
}

/** All real fixtures with live scores/status merged from the DB. Static fixtures
 *  supply the group-stage structure; real knockout matchups (unknown at build
 *  time) come straight from the DB. TBD placeholders are dropped in favour of
 *  the DB's real fixtures. */
export async function getFixturesWithScores(now: Date = new Date()): Promise<Match[]> {
  let db: SyncedMatch[] = [];
  try {
    const { getAllScores } = await import("./db");
    db = await getAllScores();
  } catch {
    db = await getApiFootballScoreRows();
  }
  const dbById = new Map(db.map((s) => [s.match_id, s]));

  const merged: Match[] = matches.filter(isRealFixture).map((m) => {
    const s = dbById.get(m.id);
    const status: Match["status"] = s
      ? s.status === "FINISHED"
        ? "finished"
        : s.status === "IN_PLAY" || s.status === "PAUSED"
          ? "live"
          : liveStatus(m, now)
      : liveStatus(m, now);
    return s
      ? {
          ...m,
          homeScore: s.home_score ?? m.homeScore,
          awayScore: s.away_score ?? m.awayScore,
          homePenaltyScore: s.home_penalty_score ?? null,
          awayPenaltyScore: s.away_penalty_score ?? null,
          winner: s.winner ?? null,
          status,
          stage: s.stage ?? m.stage,
        }
      : { ...m, status };
  });

  // Real fixtures that live only in the DB — i.e. knockout matchups.
  const staticIds = new Set(matches.map((m) => m.id));
  for (const s of db) {
    if (!staticIds.has(s.match_id) && s.home_team !== "tbd" && s.away_team !== "tbd") {
      merged.push(dbRowToMatch(s, now));
    }
  }
  return merged;
}

/** Homepage match buckets (today / upcoming / recent results), DB-aware so real
 *  knockout fixtures appear once their matchups are known. Mirrors the
 *  getTodayMatches / getUpcomingMatches / getRecentResults logic over the merged
 *  fixture list. */
export async function getHomeMatchSections(
  now: Date = new Date()
): Promise<{ today: Match[]; upcoming: Match[]; recent: Match[] }> {
  const all = await getFixturesWithScores(now);
  const today = siteDateStr(now);
  const byKo = (a: Match, b: Match) => matchKickoff(a).getTime() - matchKickoff(b).getTime();

  return {
    today: all
      .filter((m) => siteDateStr(matchKickoff(m)) === today && m.status !== "finished")
      .sort(byKo),
    upcoming: all
      .filter(
        (m) => matchKickoff(m).getTime() > now.getTime() && siteDateStr(matchKickoff(m)) !== today
      )
      .sort(byKo)
      .slice(0, 6),
    recent: all
      .filter((m) => m.status === "finished")
      .sort((a, b) => matchKickoff(b).getTime() - matchKickoff(a).getTime())
      .slice(0, 6),
  };
}

// ─── Knockout bracket ─────────────────────────────────────────────────
export interface BracketMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  winner?: "home" | "away" | null;
  status: Match["status"];
  date: string;
  time: string;
  venue: string;
}

export interface BracketRound {
  key: string;
  label: string;
  matches: BracketMatch[];
}

const KNOCKOUT_ROUNDS: { key: string; label: string; stages: string[] }[] = [
  { key: "r32", label: "Round of 32", stages: ["ROUND_OF_32"] },
  { key: "r16", label: "Round of 16", stages: ["LAST_16", "ROUND_OF_16"] },
  { key: "qf", label: "Quarter-finals", stages: ["QUARTER_FINALS"] },
  { key: "sf", label: "Semi-finals", stages: ["SEMI_FINALS"] },
  { key: "tp", label: "Third-place Play-off", stages: ["THIRD_PLACE"] },
  { key: "final", label: "Final", stages: ["FINAL"] },
];

const byKickoff = (a: BracketMatch, b: BracketMatch) =>
  (a.date + a.time).localeCompare(b.date + b.time);

// Returns the knockout bracket merged with live DB fixtures when available;
// before the draw it falls back to the static schedule skeleton (TBD slots),
// so the page is useful — and rankable — throughout the tournament.
export async function getKnockoutBracket(): Promise<BracketRound[]> {
  let db: import("./db").SyncedMatch[] = [];
  try {
    const { getAllScores } = await import("./db");
    db = await getAllScores();
  } catch {
    db = await getApiFootballScoreRows();
  }

  return KNOCKOUT_ROUNDS.map((round) => {
    const dbRows = db.filter((s) => s.stage && round.stages.includes(s.stage));
    const fromDb: BracketMatch[] = dbRows.map((s) => ({
      id: s.match_id,
      homeTeam: s.home_team,
      awayTeam: s.away_team,
      homeScore: s.home_score,
      awayScore: s.away_score,
      homePenaltyScore: s.home_penalty_score ?? null,
      awayPenaltyScore: s.away_penalty_score ?? null,
      winner: s.winner ?? null,
      status:
        s.status === "FINISHED"
          ? "finished"
          : s.status === "IN_PLAY" || s.status === "PAUSED"
            ? "live"
            : "upcoming",
      date: s.utc_date.slice(0, 10),
      time: s.utc_date.slice(11, 16),
      venue: "",
    }));
    // A round can be partially synced (API-Football only publishes a fixture
    // once its bracket slot is decided), so fill any slot the DB hasn't
    // picked up yet from the static skeleton instead of dropping it — a
    // missing quarter-final looked like a bug, not an undecided TBD match.
    const dbDates = new Set(fromDb.map((m) => m.date));
    const fallback: BracketMatch[] = matches
      .filter((m) => round.stages.includes(m.stage) && !dbDates.has(m.date))
      .map((m) => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winner: null,
        status: m.status,
        date: m.date,
        time: m.time,
        venue: m.venue,
      }));
    const list = [...fromDb, ...fallback];
    return { key: round.key, label: round.label, matches: list.sort(byKickoff) };
  });
}

// Human-readable stage label, e.g. "ROUND_OF_16" → "Round of 16".
export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "Group Stage",
    ROUND_OF_32: "Round of 32",
    LAST_16: "Round of 16",
    ROUND_OF_16: "Round of 16",
    QUARTER_FINALS: "Quarter-final",
    SEMI_FINALS: "Semi-final",
    THIRD_PLACE: "Third-place Play-off",
    FINAL: "Final",
  };
  return map[stage] || stage.replace(/_/g, " ");
}

export function getMatchesByDate(date: string): Match[] {
  return matches.filter((m) => m.date === date);
}

// ─── Time / "today" helpers ───────────────────────────────────────────
// The 2026 World Cup is hosted across North America and its core audience is
// in the US, so we treat US Eastern as the canonical "site time". Match days
// routinely straddle UTC midnight, so bucketing by UTC date made "today" look
// arbitrary depending on the hour. We bucket by the ET calendar date instead
// and derive status from the live clock — never from build-time state.
const SITE_TZ = "America/New_York";
const MATCH_DURATION_MS = 120 * 60 * 1000;

export function matchKickoff(m: Pick<Match, "date" | "time">): Date {
  return new Date(`${m.date}T${m.time}`);
}

/**
 * The single canonical kickoff instant as a UTC ISO‑8601 string
 * (e.g. "2026-06-24T19:00:00.000Z"). Every surface — cards, detail page,
 * countdown, JSON‑LD — derives its display from this one value so all pages
 * convert back to the same UTC time.
 */
export function matchKickoffISO(m: Pick<Match, "date" | "time">): string {
  return matchKickoff(m).toISOString();
}

/** YYYY-MM-DD for a Date in the site's display timezone (ET). */
export function siteDateStr(d: Date): string {
  // en-CA renders ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Human "Jun 23, 2026, 14:30 ET" stamp for the "last updated" line. */
export function formatSiteTime(d: Date): string {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${s} ET`;
}

/** Live-clock status for a fixture, independent of build/render time. */
export function liveStatus(m: Match, now: Date = new Date()): Match["status"] {
  const ko = matchKickoff(m).getTime();
  const t = now.getTime();
  if (t >= ko + MATCH_DURATION_MS) return "finished";
  if (t >= ko) return "live";
  return "upcoming";
}

const isRealFixture = (m: Match) => m.homeTeam !== "tbd" && m.awayTeam !== "tbd";

// Today = fixtures whose ET kickoff date is today AND not yet finished.
// Finished games drop into getRecentResults so "Today's Matches" never shows a
// stale result as if it were still to come.
export function getTodayMatches(now: Date = new Date()): Match[] {
  const today = siteDateStr(now);
  return matches
    .filter(isRealFixture)
    .filter(
      (m) =>
        siteDateStr(matchKickoff(m)) === today &&
        liveStatus(m, now) !== "finished"
    )
    .map((m) => ({ ...m, status: liveStatus(m, now) }))
    .sort((a, b) => matchKickoff(a).getTime() - matchKickoff(b).getTime());
}

// Upcoming = kickoffs strictly after `now` on a later ET day than today
// (today's fixtures already render in their own section). Soonest first.
export function getUpcomingMatches(limit: number = 6, now: Date = new Date()): Match[] {
  const today = siteDateStr(now);
  return matches
    .filter(isRealFixture)
    .filter(
      (m) =>
        matchKickoff(m).getTime() > now.getTime() &&
        siteDateStr(matchKickoff(m)) !== today
    )
    .map((m) => ({ ...m, status: "upcoming" as const }))
    .sort((a, b) => matchKickoff(a).getTime() - matchKickoff(b).getTime())
    .slice(0, limit);
}

// Recent results = finished fixtures, most recent first.
export function getRecentResults(limit: number = 6, now: Date = new Date()): Match[] {
  return matches
    .filter((m) => isRealFixture(m) && liveStatus(m, now) === "finished")
    .map((m) => ({ ...m, status: "finished" as const }))
    .sort((a, b) => matchKickoff(b).getTime() - matchKickoff(a).getTime())
    .slice(0, limit);
}

// ─── Group helpers ────────────────────────────────────────────────────
export function getGroupSlug(groupName: string): string {
  return groupName.replace("Group ", "").toLowerCase();
}

export function getGroupFromSlug(slug: string): string | undefined {
  return groups.find((g) => getGroupSlug(g) === slug);
}

export function getTeamsByGroup(groupName: string): TeamInfo[] {
  return teams.filter((t) => t.group === groupName);
}

export function getMatchesByGroup(groupName: string): Match[] {
  const groupTeams = getTeamsByGroup(groupName).map((t) => t.name);
  return matches.filter(
    (m) =>
      m.stage === "GROUP_STAGE" &&
      groupTeams.includes(m.homeTeam) &&
      groupTeams.includes(m.awayTeam)
  );
}

export function getGroupStandings(groupName: string): StandingEntry[] {
  const groupTeams = getTeamsByGroup(groupName).map((t) => t.name);
  return standings.filter((s) => groupTeams.includes(s.team));
}

// ─── Team helpers ─────────────────────────────────────────────────────
export function getTeamById(id: string): TeamInfo | undefined {
  return teams.find((t) => t.id === id);
}

export function getMatchesByTeam(teamName: string): Match[] {
  return matches.filter(
    (m) => m.homeTeam === teamName || m.awayTeam === teamName
  );
}

export function getTeamFlag(id: string): string {
  return getTeamFlagUrl(id);
}
