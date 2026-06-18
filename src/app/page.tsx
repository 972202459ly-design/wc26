"use client";

import Link from "next/link";
import { matches, getTodayMatches, getUpcomingMatches, amazonSearchLink } from "@/lib/data";
import MatchCard from "@/components/MatchCard";
import AdPlaceholder from "@/components/AdPlaceholder";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import { useTranslations } from "next-intl";

interface LiveMatch {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

function mergeScores(staticMatches: Match[], live: LiveMatch[]): Match[] {
  const map = new Map<string, LiveMatch>();
  for (const lm of live) map.set(lm.match_id, lm);

  return staticMatches.map((m) => {
    const live = map.get(m.id);
    if (!live) return m;
    return {
      ...m,
      homeScore: live.home_score ?? m.homeScore,
      awayScore: live.away_score ?? m.awayScore,
      status: live.status === "FINISHED" ? "finished" : live.status === "IN_PLAY" ? "live" : m.status,
    };
  });
}

export default function HomePage() {
  const [liveScores, setLiveScores] = useState<LiveMatch[] | null>(null);
  const t = useTranslations("home");
  const navT = useTranslations("home.quickNav");
  const shopT = useTranslations("home.shop");
  const ctaT = useTranslations("home.cta");

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => {
        if (data.matches) setLiveScores(data.matches);
      })
      .catch(() => {});
  }, []);

  const merged = liveScores ? mergeScores(matches, liveScores) : matches;
  const mergedToday = liveScores ? mergeScores(getTodayMatches(), liveScores) : getTodayMatches();
  const mergedUpcoming = liveScores ? mergeScores(getUpcomingMatches(6), liveScores) : getUpcomingMatches(6);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-24 sm:py-32 text-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1400&q=80')",
            backgroundPosition: "center 30%",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-[#0a0a0a]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#f0a500]/10 to-transparent blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#f0a500] mb-4">
            {t("heroDate")}
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
            {t("heroTitle")}
          </h1>
          <p className="text-lg sm:text-xl text-[#aaa] mb-8 max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/premium"
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
            >
              {t("heroSubscribe")}
            </Link>
            <Link
              href="/subscribe"
              className="px-6 py-3 text-sm font-semibold rounded-lg border border-gray-600 text-white hover:bg-white/10 transition-colors"
            >
              {t("heroFreeLink")}
            </Link>
            <Link
              href="/schedule"
              className="px-6 py-3 text-sm font-semibold rounded-lg border border-gray-600 text-white hover:bg-white/10 transition-colors"
            >
              {t("viewFullSchedule")}
            </Link>
          </div>
        </div>
      </section>

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

      {/* Pick'em game CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#f0a500]/40 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center sm:flex-row sm:text-left">
          <div className="text-4xl">🎯</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Play the World Cup Pick&apos;em</h2>
            <p className="mt-1 text-sm text-[#aaa]">
              Predict matches with <b className="text-[#f0a500]">1,000 free points</b>, bet at AI-derived odds, and climb the leaderboard. No money — just bragging rights.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/leaderboard" className="rounded-lg border border-[#444] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#f0a500]">
              Leaderboard
            </Link>
            <Link href="/schedule" className="rounded-lg bg-[#f0a500] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#d49500]">
              Make a prediction →
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Matches */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold mb-4">{t("todaysMatches")}</h2>
        {mergedToday.length > 0 ? (
          <div className="grid gap-3">
            {mergedToday.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#111] rounded-xl border border-[#222]">
            <p className="text-[#888]">
              {t("noMatchesToday")}
            </p>
          </div>
        )}
      </section>

      {/* Ad banner */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <AdPlaceholder size="banner" />
      </section>

      {/* Upcoming Matches */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold mb-4">{t("upcomingMatches")}</h2>
        <div className="grid gap-3">
          {mergedUpcoming.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      {/* Ad banner */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <AdPlaceholder size="banner" />
      </section>

      {/* Shop — Amazon Affiliate */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-8 text-center">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-4">
            {shopT("sponsored")}
          </span>
          <h2 className="text-2xl font-bold mb-2">{shopT("title")}</h2>
          <p className="text-sm text-[#888] mb-6 max-w-lg mx-auto">
            {shopT("description")}
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
            <a
              href={amazonSearchLink("World Cup 2026 jersey")}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-3xl">👕</span>
              <span className="text-xs font-semibold">{shopT("jerseys")}</span>
            </a>
            <a
              href={amazonSearchLink("World Cup 2026 flag")}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-3xl">🚩</span>
              <span className="text-xs font-semibold">{shopT("flags")}</span>
            </a>
            <a
              href={amazonSearchLink("soccer ball size 5 official match")}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#f0a500]/40 transition-all"
            >
              <span className="text-3xl">⚽</span>
              <span className="text-xs font-semibold">{shopT("balls")}</span>
            </a>
          </div>
          <a
            href={amazonSearchLink("World Cup 2026 fan gear")}
            target="_blank" rel="noopener noreferrer"
            className="inline-block px-8 py-3 text-sm font-bold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            {shopT("browseAll")}
          </a>
          <p className="text-[10px] text-[#555] mt-3">
            {shopT("affiliateNotice")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#222] py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">{ctaT("title")}</h2>
          <p className="text-[#888] mb-6">
            {ctaT("description")}
          </p>
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
