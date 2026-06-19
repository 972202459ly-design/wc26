import { getMatchByIdWithScore, stageLabel, matches } from "@/lib/data";
import { notFound } from "next/navigation";
import MatchDetail from "./MatchDetail";
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

  // Floating local datetime (valid ISO 8601); end ~2h after kickoff. Guard
  // against missing/odd date or time so we never emit an invalid startDate.
  const rawStart = `${match.date}T${match.time || "12:00"}:00`;
  const startMs = Date.parse(`${rawStart}Z`);
  const valid = Number.isFinite(startMs);
  const startDate = valid ? rawStart : `${match.date || "2026-06-11"}T12:00:00`;
  const endDate = valid
    ? new Date(startMs + 2 * 60 * 60 * 1000).toISOString().slice(0, 19)
    : `${match.date || "2026-06-11"}T14:00:00`;

  const teams = [
    { "@type": "SportsTeam", name: match.homeTeam },
    { "@type": "SportsTeam", name: match.awayTeam },
  ];

  // SportsEvent structured data — required by Google's Event rich results.
  // location & startDate are required; image/offers/performer/organizer/
  // description are recommended (venue data is currently empty, so we fall back
  // to the host-nation location).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.homeTeam} vs ${match.awayTeam}`,
    description: `${match.homeTeam} vs ${match.awayTeam} — ${stageLabel(match.stage)}, FIFA World Cup 2026. Live score, predictions and updates.`,
    startDate,
    endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Football",
    url: `https://wc26live.org/match/${match.id}`,
    image: ["https://wc26live.org/opengraph-image"],
    location: {
      "@type": "Place",
      name: match.venue || "FIFA World Cup 2026 Venue",
      address: {
        "@type": "PostalAddress",
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "FIFA",
      url: "https://www.fifa.com",
    },
    performer: teams,
    competitor: teams,
    offers: {
      "@type": "Offer",
      url: `https://wc26live.org/match/${match.id}`,
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: `${match.date}T00:00:00`,
    },
    superEvent: {
      "@type": "SportsEvent",
      name: "FIFA World Cup 2026",
      startDate: "2026-06-11T00:00:00",
      endDate: "2026-07-19T23:59:59",
      location: {
        "@type": "Place",
        name: "United States, Canada & Mexico",
        address: { "@type": "PostalAddress", addressCountry: "US" },
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MatchDetail match={match} />
    </>
  );
}
