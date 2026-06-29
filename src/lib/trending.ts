import { liveStatus, matchKickoff, stageLabel } from "@/lib/data";
import type { Match } from "@/lib/types";

export interface TrendingItem {
  title: string;
  label: string;
  href: string;
  score: number;
}

const TEAM_WEIGHT: Record<string, number> = {
  "United States": 40,
  Mexico: 34,
  Canada: 28,
  Argentina: 38,
  Brazil: 38,
  Portugal: 36,
  France: 36,
  England: 34,
  Spain: 32,
  Germany: 32,
  Netherlands: 28,
  Italy: 28,
};

function teamScore(match: Match): number {
  return (TEAM_WEIGHT[match.homeTeam] ?? 8) + (TEAM_WEIGHT[match.awayTeam] ?? 8);
}

function timeScore(match: Match, now: Date): number {
  const diffHours = (matchKickoff(match).getTime() - now.getTime()) / 36e5;
  if (match.status === "live" || liveStatus(match, now) === "live") return 100;
  if (diffHours >= 0 && diffHours <= 6) return 70;
  if (diffHours > 6 && diffHours <= 24) return 55;
  if (diffHours > 24 && diffHours <= 72) return 35;
  if (match.status === "finished" && diffHours > -18) return 45;
  return 10;
}

function stageScore(match: Match): number {
  if (match.stage === "GROUP_STAGE") return 5;
  if (match.stage.includes("FINAL")) return 45;
  if (match.stage.includes("SEMI")) return 35;
  if (match.stage.includes("QUARTER")) return 30;
  return 20;
}

function matchTitle(match: Match, now: Date): string {
  const status = liveStatus(match, now);
  const label = `${match.homeTeam} vs ${match.awayTeam}`;

  if (status === "live") return `${label} live now: score and how to watch`;

  if (status === "finished") {
    const hasScore = match.homeScore !== null && match.awayScore !== null;
    if (hasScore) {
      return `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}: result and next game`;
    }
    return `${label} result: score and next match`;
  }

  if (match.homeTeam === "United States" || match.awayTeam === "United States") {
    return `USA next match: kickoff time and how to watch`;
  }
  if (match.homeTeam === "Argentina" || match.awayTeam === "Argentina") {
    return `Messi and Argentina: next match, preview and schedule`;
  }
  if (match.homeTeam === "Portugal" || match.awayTeam === "Portugal") {
    return `Portugal match preview: stars to watch and kickoff time`;
  }
  if (match.homeTeam === "Brazil" || match.awayTeam === "Brazil") {
    return `Brazil match preview: key players and how to watch`;
  }

  return `${label} preview: kickoff time, stars and live score`;
}

export function buildTrendingItems(matches: Match[], now = new Date(), limit = 6): TrendingItem[] {
  const real = matches.filter((m) => m.homeTeam !== "tbd" && m.awayTeam !== "tbd");
  const dynamic = real
    .map((match) => ({
      title: matchTitle(match, now),
      label: stageLabel(match.stage),
      href: `/match/${match.id}`,
      score: teamScore(match) + timeScore(match, now) + stageScore(match),
    }))
    .sort((a, b) => b.score - a.score);

  const staticItems: TrendingItem[] = [
    {
      title: "World Cup games today: schedule and TV guide",
      label: "Today",
      href: "/schedule",
      score: 92,
    },
    {
      title: "How to watch World Cup 2026 in the USA",
      label: "Watch guide",
      href: "/watch",
      score: 90,
    },
    {
      title: "World Cup bracket: who could face who next?",
      label: "Bracket",
      href: "/bracket",
      score: 72,
    },
  ];

  const seen = new Set<string>();
  return [...dynamic, ...staticItems]
    .filter((item) => {
      const key = `${item.title}|${item.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
