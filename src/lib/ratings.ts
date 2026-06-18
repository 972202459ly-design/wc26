// Approximate FIFA-ranking-style strength ratings (Elo scale) for the 48
// World Cup 2026 teams, keyed by the team names used in data.ts. The FIFA
// ranking is itself Elo-derived, so these feed directly into the Poisson
// prediction model. Values are approximate (2025 snapshot) and only need to
// be roughly correct relative to each other.
const RATINGS: Record<string, number> = {
  Argentina: 1885,
  Spain: 1875,
  France: 1860,
  Brazil: 1855,
  England: 1820,
  Portugal: 1780,
  Netherlands: 1750,
  Belgium: 1740,
  Germany: 1725,
  Croatia: 1700,
  Morocco: 1700,
  Colombia: 1690,
  Uruguay: 1680,
  "United States": 1660,
  Japan: 1655,
  Mexico: 1650,
  Senegal: 1645,
  Switzerland: 1640,
  Iran: 1630,
  Norway: 1590,
  Austria: 1585,
  Ecuador: 1575,
  "South Korea": 1575,
  Sweden: 1560,
  Turkey: 1560,
  Scotland: 1545,
  Australia: 1535,
  Canada: 1530,
  Czechia: 1525,
  Algeria: 1520,
  Egypt: 1515,
  Tunisia: 1505,
  "Ivory Coast": 1500,
  Ghana: 1495,
  Paraguay: 1490,
  "Bosnia-Herzegovina": 1485,
  "Congo DR": 1465,
  Panama: 1455,
  "South Africa": 1450,
  Qatar: 1445,
  Uzbekistan: 1445,
  "Saudi Arabia": 1430,
  Iraq: 1400,
  "Cape Verde Islands": 1395,
  Jordan: 1385,
  "New Zealand": 1380,
  Curaçao: 1360,
  Haiti: 1320,
};

const DEFAULT_RATING = 1450;

function normalize(name: string): string {
  return name.trim();
}

export function getRating(team: string): number {
  return RATINGS[normalize(team)] ?? DEFAULT_RATING;
}
