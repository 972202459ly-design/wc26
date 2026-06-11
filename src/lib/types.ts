export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "upcoming" | "live" | "finished";
  minute: number | null;
  date: string;
  time: string;
  venue: string;
  stage: string;
  homeFlag?: string;
  awayFlag?: string;
}

export interface StandingEntry {
  pos: number;
  team: string;
  flag?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface TeamInfo {
  id: string;
  name: string;
  flag?: string;
  group: string;
  ranking: number;
}

export interface MatchScore {
  match_id: string;
  home_score: number;
  away_score: number;
  status: string;
  minute: number;
  events: any[];
  updated_at: string;
}
