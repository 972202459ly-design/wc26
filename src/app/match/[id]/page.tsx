import { getMatchByIdWithScore, stageLabel, matches } from "@/lib/data";
import { notFound } from "next/navigation";
import MatchDetail from "./MatchDetail";
import MatchPrediction from "@/components/MatchPrediction";
import type { Metadata } from "next";

// Re-render server HTML periodically so crawlers and no-JS users see fresh
// scores/status without waiting for a redeploy.
export const revalidate = 120;

export async function generateStaticParams() {
  return matches.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchByIdWithScore(id);
  if (!match) return {};

  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const scoreStr = hasScore ? `${match.homeScore}-${match.awayScore}` : "vs";
  const stage = stageLabel(match.stage);
  const liveTag =
    match.status === "live"
      ? " 🔴 LIVE"
      : match.status === "finished"
        ? " (Full Time)"
        : "";

  // Title targets the high-volume "X vs Y live score" query; finished matches
  // surface the real result for stronger SERP click-through.
  const title = hasScore
    ? `${match.homeTeam} ${scoreStr} ${match.awayTeam}${liveTag} — World Cup 2026 ${stage}`
    : `${match.homeTeam} vs ${match.awayTeam} Live Score — World Cup 2026 ${stage}`;

  const description = `${match.homeTeam} vs ${match.awayTeam} live score, lineups, goals and updates — ${stage}, FIFA World Cup 2026${match.venue ? ` at ${match.venue}` : ""}. Follow it live on WC26 Live.`;

  return {
    title,
    description,
    alternates: { canonical: `https://wc26live.org/match/${match.id}` },
    openGraph: {
      title: `${match.homeTeam} ${scoreStr} ${match.awayTeam} | WC26 Live`,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${match.homeTeam} ${scoreStr} ${match.awayTeam}`,
      description: `${stage}${match.venue ? ` at ${match.venue}` : ""}.`,
    },
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatchByIdWithScore(id);
  if (!match) notFound();

  const startDate = `${match.date}T${match.time}`;

  // SportsEvent structured data — makes the match eligible for rich results
  // and helps Google rank the page for the fixture.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.homeTeam} vs ${match.awayTeam}`,
    description: `${stageLabel(match.stage)} — FIFA World Cup 2026`,
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Football",
    url: `https://wc26live.org/match/${match.id}`,
    ...(match.venue ? { location: { "@type": "Place", name: match.venue } } : {}),
    competitor: [
      { "@type": "SportsTeam", name: match.homeTeam },
      { "@type": "SportsTeam", name: match.awayTeam },
    ],
    superEvent: {
      "@type": "SportsEvent",
      name: "FIFA World Cup 2026",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MatchDetail match={match} />
      <MatchPrediction matchId={match.id} home={match.homeTeam} away={match.awayTeam} />
    </>
  );
}
