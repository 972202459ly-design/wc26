import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getHomeMatchSections,
  liveStatus,
  amazonSearchLink,
  eventPerformers,
} from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import type { Match } from "@/lib/types";
import PickemChallenge from "@/components/PickemChallenge";
import FeaturedNextMatch from "@/components/FeaturedNextMatch";
import HeroEmailCapture from "@/components/HeroEmailCapture";
import HomeSocialProof from "@/components/HomeSocialProof";
import HomeMatchSections from "@/components/HomeMatchSections";
import StandingsSnapshot from "@/components/StandingsSnapshot";
import SponsorSlot from "@/components/SponsorSlot";
import StreamingOptionsCard from "@/components/StreamingOptionsCard";
import HomeTrendingNow from "@/components/HomeTrendingNow";
import HeroQuickLinks from "@/components/HeroQuickLinks";
import { buildTrendingItems } from "@/lib/trending";
import { getPickemMatches } from "@/lib/pickem-matches";

// Re-render the served HTML periodically so crawlers and no-JS visitors always
// see the correct "today / upcoming" set based on the real clock — never a
// build-time snapshot.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "World Cup 2026 Live Scores, Schedule & How to Watch",
  description:
    "Follow the 2026 FIFA World Cup with live scores, match schedules, group standings, brackets, and streaming guide links for U.S. fans.",
  alternates: { canonical: "https://wc26live.org/" },
};

export default async function HomePage() {
  const now = new Date();
  const { today, upcoming, recent } = await getHomeMatchSections(now);
  const pickemMatches = await getPickemMatches();

  const t = await getTranslations("home");
  const navT = await getTranslations("home.quickNav");
  const shopT = await getTranslations("home.shop");
  const ctaT = await getTranslations("home.cta");
  const quickLinks = [
    { href: "/predict", label: "Beat the AI" },
    { href: "/watch", label: "How to Watch" },
    { href: "/schedule", label: navT("schedule") },
    { href: "/teams", label: navT("teams") },
  ];
  const trendingItems = buildTrendingItems(
    [...today, ...upcoming, ...recent] as Match[],
    now
  );

  // Deterministic predictions for the win-probability bars on upcoming cards —
  // computed server-side so they land in the HTML for SEO.
  const predictions: Record<string, { homePct: number; drawPct: number; awayPct: number }> = {};
  for (const m of [...today, ...upcoming]) {
    if (liveStatus(m, now) === "upcoming") {
      const p = predictMatch(m.homeTeam, m.awayTeam);
      predictions[m.id] = { homePct: p.homePct, drawPct: p.drawPct, awayPct: p.awayPct };
    }
  }

  // Tournament-level SportsEvent — emitted only on the homepage so it never
  // collides with the per-fixture SportsEvent on match pages.
  const tournamentJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "2026 FIFA World Cup",
    description:
      "The 2026 FIFA World Cup — 48 teams across the United States, Canada and Mexico. Live scores, schedule, standings and knockout bracket.",
    sport: "Football",
    startDate: "2026-06-11T00:00:00Z",
    endDate: "2026-07-19T23:59:59Z",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: "https://wc26live.org",
    image: ["https://wc26live.org/opengraph-image"],
    organizer: { "@type": "Organization", name: "FIFA", url: "https://www.fifa.com" },
    location: {
      "@type": "Place",
      name: "United States, Canada & Mexico",
      address: { "@type": "PostalAddress", addressCountry: "US" },
    },
    offers: {
      "@type": "Offer",
      url: "https://wc26live.org",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: "2026-06-11T00:00:00Z",
    },
    performer: eventPerformers,
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(tournamentJsonLd) }}
      />
      {/* Hero — brand + live/upcoming prediction widget. Kept compact on mobile
          (≈ one short screen) so the first match content shows after a slight
          scroll. */}
      <section className="relative py-8 sm:py-16 text-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1400&q=80')",
            backgroundPosition: "center 30%",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-[#0a0a0a]" />
        <div className="absolute top-0 left-1/2 h-[300px] w-[calc(100vw-2rem)] max-w-[600px] -translate-x-1/2 bg-gradient-to-b from-[#f0a500]/10 to-transparent blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#f0a500] mb-4">
            {t("heroDate")}
          </span>
          <h1 className="text-[40px] sm:text-6xl lg:text-7xl font-bold mb-3 sm:mb-4 leading-[1.05]">
            {t("heroTitle")}
          </h1>
          <p className="hidden sm:block text-lg sm:text-xl text-[#aaa] mb-7 max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>
          <div className="mx-auto mb-6 flex max-w-xl flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/watch"
              className="w-full rounded-lg bg-[#f0a500] px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-[#d49500] sm:w-auto"
            >
              Check Streaming Options
            </Link>
            <a
              href="https://www.amazon.com/amazonprime?tag=none03e04-20"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="w-full rounded-lg border border-[#f0a500]/60 px-6 py-3 text-sm font-bold text-[#f0a500] transition-colors hover:bg-[#f0a500] hover:text-black sm:w-auto"
            >
              Prime / Fire TV setup
            </a>
          </div>
          <p className="mx-auto mb-6 max-w-md text-[11px] leading-5 text-[#777]">
            WC26 Live does not stream matches. Availability varies by country and broadcaster.
          </p>
          <HeroEmailCapture />
          <HeroQuickLinks links={quickLinks} />
          <FeaturedNextMatch />
          <HomeSocialProof />
        </div>
      </section>

      <PickemChallenge matches={pickemMatches} />

      <section className="max-w-7xl mx-auto px-4 pb-8">
        <StreamingOptionsCard placement="home_before_matches" title="Watching World Cup 2026 online?" />
      </section>

      <HomeTrendingNow items={trendingItems} />

      {/* Today / Upcoming / Recent results — the core SEO content */}
      <HomeMatchSections
        today={today as Match[]}
        upcoming={upcoming as Match[]}
        recent={recent as Match[]}
        predictions={predictions}
        generatedAt={now.toISOString()}
      />

      {/* Standings snapshot */}
      <StandingsSnapshot />

      {/* Matchday sponsor (or house ad → /advertise when unsold) */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <SponsorSlot placement="matchday" />
      </section>

      {/* Shop — Amazon Affiliate (kept after all primary content) */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-8 text-center">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-4">
            {shopT("sponsored")}
          </span>
          <h2 className="text-2xl font-bold mb-2">Watch World Cup 2026 Online</h2>
          <p className="text-sm text-[#888] mb-6 max-w-lg mx-auto">
            Check official streaming options, Prime and Fire TV setup ideas, and match-day devices before kickoff.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto mb-5 sm:grid-cols-5">
            {/* Prime / Fire TV setup */}
            <a
              href="https://www.amazon.com/amazonprime?tag=none03e04-20"
              target="_blank" rel="noopener noreferrer sponsored"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-lg font-bold">Prime</span>
              <span className="text-xs font-semibold text-center leading-tight">Setup</span>
            </a>
            {/* Streaming device */}
            <a
              href={amazonSearchLink("Fire TV Stick 4K streaming device")}
              target="_blank" rel="noopener noreferrer sponsored"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-lg font-bold">TV</span>
              <span className="text-xs font-semibold text-center leading-tight">Fire TV</span>
            </a>
            {/* Party Speaker */}
            <a
              href={amazonSearchLink("portable bluetooth speaker outdoor party")}
              target="_blank" rel="noopener noreferrer sponsored"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-lg font-bold">Audio</span>
              <span className="text-xs font-semibold text-center leading-tight">Speaker</span>
            </a>
            {/* Watch party supplies */}
            <a
              href={amazonSearchLink("soccer watch party supplies decorations")}
              target="_blank" rel="noopener noreferrer sponsored"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-lg font-bold">Fan</span>
              <span className="text-xs font-semibold text-center leading-tight">Watch Party</span>
            </a>
            {/* TV / projector for the watch party */}
            <a
              href={amazonSearchLink("4K smart tv streaming sports")}
              target="_blank" rel="noopener noreferrer sponsored"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-lg font-bold">4K</span>
              <span className="text-xs font-semibold text-center leading-tight">4K TV</span>
            </a>
          </div>
          <a
            href="https://www.amazon.com/amazonprime?tag=none03e04-20"
            target="_blank" rel="noopener noreferrer sponsored"
            className="inline-block px-8 py-3 text-sm font-bold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            Check Prime / Fire TV Setup
          </a>
          <p className="text-[10px] text-[#555] mt-3">
            {shopT("affiliateNotice")} Streaming availability varies by country and broadcaster.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#222] py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">{ctaT("title")}</h2>
          <p className="text-[#888] mb-6">{ctaT("description")}</p>
          <Link
            href="/subscribe"
            className="inline-block px-6 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors"
          >
            {ctaT("button")}
          </Link>
        </div>
      </section>
    </div>
  );
}
