import { getMatchByIdWithScore, stageLabel, matches } from "@/lib/data";
import { predictMatch, oddsFromPct, predictionSentence } from "@/lib/predict";
import { ensurePredictionsTable, getCachedAnalysis } from "@/lib/db";
import { notFound } from "next/navigation";
import MatchDetail from "./MatchDetail";
import AdSlot from "@/components/AdSlot";
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

  // Finished/live: lead with the result for click-through. Upcoming: target the
  // high-intent preview/time/watch queries alongside "live score".
  const title = hasScore
    ? `${match.homeTeam} ${scoreStr} ${match.awayTeam}${liveTag} — World Cup 2026 ${stage}`
    : `${match.homeTeam} vs ${match.awayTeam} Preview, Stars & Live Score — World Cup 2026 ${stage}`;

  const description = hasScore
    ? `${match.homeTeam} vs ${match.awayTeam} live score, goals and updates — ${stage}, FIFA World Cup 2026${match.venue ? ` at ${match.venue}` : ""}. Follow it live on WC26 Live.`
    : `${match.homeTeam} vs ${match.awayTeam} pre-match preview, key players, match outlook, kickoff time and live score — ${stage}, FIFA World Cup 2026${match.venue ? ` at ${match.venue}` : ""}.`;

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

  // Compute the model output server-side so the match outlook, expected goals,
  // scoreline and a descriptive sentence are in the HTML for crawlers and no-JS
  // users. Deterministic (predictMatch is pure), so it's safe inside the
  // statically-generated page.
  const p = predictMatch(match.homeTeam, match.awayTeam);
  const prediction = {
    ...p,
    oddsHome: oddsFromPct(p.homePct),
    oddsDraw: oddsFromPct(p.drawPct),
    oddsAway: oddsFromPct(p.awayPct),
  };
  // Teaser = first sentence of the cached LLM analysis if present, else a
  // deterministic sentence. No cookies() here, so the page stays static; the
  // full Pro breakdown is hydrated client-side for premium users.
  let analysisTeaser = predictionSentence(match.homeTeam, match.awayTeam, p);
  try {
    await ensurePredictionsTable();
    const cached = await getCachedAnalysis(id);
    if (cached) analysisTeaser = cached.split(/(?<=[.!?])\s/)[0];
  } catch {
    // DB unavailable — deterministic sentence already set.
  }

  // Single canonical kickoff instant (UTC ISO 8601); end ~2h after kickoff.
  // `match.time` already carries the trailing "Z" (e.g. "19:00:00Z"), so we
  // derive both timestamps from the same Date and never hand-concatenate.
  const ko = new Date(`${match.date}T${match.time}`);
  const valid = Number.isFinite(ko.getTime());
  const toIso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  const startDate = valid ? toIso(ko) : `${match.date || "2026-06-11"}T12:00:00Z`;
  const endDate = valid
    ? toIso(new Date(ko.getTime() + 2 * 60 * 60 * 1000))
    : `${match.date || "2026-06-11"}T14:00:00Z`;

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
    description: `${match.homeTeam} vs ${match.awayTeam} — ${stageLabel(match.stage)}, FIFA World Cup 2026. Live score, pre-match preview and updates.`,
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
      validFrom: `${match.date}T00:00:00Z`,
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://wc26live.org/" },
      { "@type": "ListItem", position: 2, name: "Schedule", item: "https://wc26live.org/schedule" },
      {
        "@type": "ListItem",
        position: 3,
        name: `${match.homeTeam} vs ${match.awayTeam}`,
        item: `https://wc26live.org/match/${match.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }}
      />
      <MatchDetail
        match={match}
        prediction={prediction}
        analysisTeaser={analysisTeaser}
      />
      {/* Display ad below the match body — inert until AdSense is configured.
          This page is statically generated (no cookies), so it can't be
          premium-gated server-side; match traffic is overwhelmingly anonymous. */}
      <AdSlot className="my-8" />
    </>
  );
}
