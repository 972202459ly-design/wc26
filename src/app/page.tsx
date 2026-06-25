import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getTodayMatches,
  getUpcomingMatches,
  getRecentResults,
  liveStatus,
  amazonSearchLink,
  eventPerformers,
} from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import type { Match } from "@/lib/types";
import FeaturedNextMatch from "@/components/FeaturedNextMatch";
import HeroEmailCapture from "@/components/HeroEmailCapture";
import HomeSocialProof from "@/components/HomeSocialProof";
import HomeMatchSections from "@/components/HomeMatchSections";
import StandingsSnapshot from "@/components/StandingsSnapshot";
import SponsorSlot from "@/components/SponsorSlot";

// Re-render the served HTML periodically so crawlers and no-JS visitors always
// see the correct "today / upcoming" set based on the real clock — never a
// build-time snapshot.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "World Cup 2026 Live Scores, Schedule, Standings & Predictions",
  description:
    "Follow the 2026 FIFA World Cup with live scores, match schedules, group standings, teams, brackets, and free prediction games.",
  alternates: { canonical: "https://wc26live.org/" },
};

export default async function HomePage() {
  const now = new Date();
  const today = getTodayMatches(now);
  const upcoming = getUpcomingMatches(6, now);
  const recent = getRecentResults(6, now);

  const t = await getTranslations("home");
  const navT = await getTranslations("home.quickNav");
  const shopT = await getTranslations("home.shop");
  const ctaT = await getTranslations("home.cta");

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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#f0a500]/10 to-transparent blur-3xl" />

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
          {/* Email capture — above the fold, before AI module */}
          <div className="mx-auto mb-6 max-w-md">
            <p className="text-sm text-[#aaa] mb-3">
              ⚡ Free final-score alerts &amp; match previews — straight to your inbox
            </p>
            <HeroEmailCapture />
          </div>
          <FeaturedNextMatch />
          <HomeSocialProof />
        </div>
      </section>

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

      {/* Quick Nav Cards */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: "/schedule", label: navT("schedule"), desc: navT("scheduleDesc") },
            { href: "/standings", label: navT("standings"), desc: navT("standingsDesc") },
            { href: "/teams", label: navT("teams"), desc: navT("teamsDesc") },
            { href: "/subscribe", label: navT("subscribe"), desc: navT("subscribeDesc") },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="p-4 rounded-xl border border-[#3a3a5e] bg-[#1e1e35] hover:border-[#f0a500] hover:bg-[#2a2a4e] transition-all"
            >
              <h3 className="font-semibold text-white">{card.label}</h3>
              <p className="text-sm text-[#888] mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Private league CTA — flagship new feature, surfaced above the generic game CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-[#f0a500]/70 bg-gradient-to-br from-[#241a3a] to-[#111] p-6 text-center shadow-lg shadow-[#f0a500]/10 sm:flex-row sm:text-left">
          <div className="text-4xl">🏆</div>
          <div className="flex-1">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-lg font-bold text-white">Run a private World Cup Pick&apos;em</h2>
              <span className="rounded bg-[#f0a500] px-1.5 py-0.5 text-[10px] font-bold text-black">NEW</span>
            </div>
            <p className="mt-1 text-sm text-[#aaa]">
              Create a league for friends, coworkers or your watch party — everyone predicts, you crown
              your own champion.{" "}
              <span className="text-[#ddd]">$14.99 one-time as host · everyone you invite joins free.</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/leagues/create"
              className="rounded-lg bg-[#f0a500] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#d49500]"
            >
              Create a Private League →
            </Link>
          </div>
        </div>
      </section>

      {/* Pick'em game CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#f0a500]/40 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center sm:flex-row sm:text-left">
          <div className="text-4xl">🎯</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Play the World Cup Pick&apos;em</h2>
            <p className="mt-1 text-sm text-[#aaa]">
              Predict matches with <b className="text-[#f0a500]">1,000 free points</b> using AI win
              probabilities, and climb the leaderboard. No money — just bragging rights.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/leaderboard"
              className="rounded-lg border border-[#444] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#f0a500]"
            >
              Leaderboard
            </Link>
            <Link
              href="/predict"
              className="rounded-lg bg-[#f0a500] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#d49500]"
            >
              Make a prediction →
            </Link>
          </div>
        </div>
      </section>

      {/* Qualification simulator CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <Link
          href="/simulator"
          className="flex flex-col items-center gap-4 rounded-2xl border border-[#3a3a5e] bg-[#1e1e35] p-6 text-center transition-colors hover:border-[#f0a500] sm:flex-row sm:text-left"
        >
          <div className="text-4xl">🗺️</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Who advances? Try the Qualification Simulator</h2>
            <p className="mt-1 text-sm text-[#aaa]">
              Pick every group result and see all 32 teams that reach the Round of 32 — top two per
              group plus the 8 best third-placed sides.
            </p>
          </div>
          <span className="shrink-0 rounded-lg border border-[#f0a500] px-4 py-2.5 text-sm font-semibold text-[#f0a500]">
            Open simulator →
          </span>
        </Link>
      </section>

      {/* Matchday sponsor (or house ad → /advertise when unsold) */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <SponsorSlot placement="matchday" />
      </section>

      {/* Email alerts */}
      <section className="max-w-2xl mx-auto px-4 pb-12 text-center">
        <h2 className="text-lg font-bold text-white mb-1">{t("email.title")}</h2>
        <p className="text-sm text-[#999] mb-4">{t("email.subtitle")}</p>
        <HeroEmailCapture />
      </section>

      {/* Shop — Amazon Affiliate (kept after all primary content) */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-8 text-center">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-4">
            {shopT("sponsored")}
          </span>
          <h2 className="text-2xl font-bold mb-2">{shopT("title")}</h2>
          <p className="text-sm text-[#888] mb-6 max-w-lg mx-auto">
            {shopT("description")}
          </p>
          <div className="grid grid-cols-4 gap-3 max-w-xl mx-auto mb-5">
            {/* Streaming device */}
            <a
              href={amazonSearchLink("Fire TV Stick 4K streaming device")}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-2xl">📡</span>
              <span className="text-xs font-semibold text-center leading-tight">{shopT("jerseys")}</span>
            </a>
            {/* Party Speaker */}
            <a
              href={amazonSearchLink("portable bluetooth speaker outdoor party")}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-2xl">🔊</span>
              <span className="text-xs font-semibold text-center leading-tight">{shopT("flags")}</span>
            </a>
            {/* Watch party supplies */}
            <a
              href={amazonSearchLink("soccer watch party supplies decorations")}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-2xl">🎉</span>
              <span className="text-xs font-semibold text-center leading-tight">{shopT("balls")}</span>
            </a>
            {/* TV / projector for the watch party */}
            <a
              href={amazonSearchLink("4K smart tv")}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-2xl">📺</span>
              <span className="text-xs font-semibold text-center leading-tight">TV &amp; Displays</span>
            </a>
          </div>
          <a
            href={amazonSearchLink("soccer watch party supplies streaming")}
            target="_blank" rel="noopener noreferrer"
            className="inline-block px-8 py-3 text-sm font-bold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            {shopT("browseAll")}
          </a>
          <p className="text-[10px] text-[#555] mt-3">{shopT("affiliateNotice")}</p>
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
