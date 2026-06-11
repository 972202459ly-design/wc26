"use client";

import Link from "next/link";
import { matches, getTodayMatches, getUpcomingMatches } from "@/lib/data";
import MatchCard from "@/components/MatchCard";
import AdPlaceholder from "@/components/AdPlaceholder";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";

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
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1400&q=80')",
            backgroundPosition: "center 30%",
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-[#0a0a0a]" />
        {/* Animated gradient accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-[#f0a500]/10 to-transparent blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#f0a500] mb-4">
            June 11 — July 19, 2026
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
            2026 FIFA World Cup
          </h1>
          <p className="text-lg sm:text-xl text-[#aaa] mb-8 max-w-2xl mx-auto">
            Hosted across the United States, Canada, and Mexico. 48 teams. One
            trophy.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/schedule"
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
            >
              View Full Schedule
            </Link>
            <Link
              href="/standings"
              className="px-6 py-3 text-sm font-semibold rounded-lg border border-gray-600 text-white hover:bg-white/10 transition-colors"
            >
              Live Standings
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Nav Cards */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: "/schedule", label: "Schedule", desc: "Full match schedule" },
            { href: "/standings", label: "Standings", desc: "Group standings" },
            { href: "/teams", label: "Teams", desc: "All 48 teams" },
            { href: "/subscribe", label: "Subscribe", desc: "Free match alerts" },
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

      {/* Today's Matches */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold mb-4">Today&apos;s Matches</h2>
        {mergedToday.length > 0 ? (
          <div className="grid gap-3">
            {mergedToday.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#111] rounded-xl border border-[#222]">
            <p className="text-[#888]">
              No matches scheduled for today.
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
        <h2 className="text-xl font-bold mb-4">Upcoming Matches</h2>
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

      {/* CTA */}
      <section className="border-t border-[#222] py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">Never Miss a Goal</h2>
          <p className="text-[#888] mb-6">
            Get real-time goal alerts, match reminders, and daily digests
            delivered to your inbox. Free.
          </p>
          <Link
            href="/subscribe"
            className="inline-block px-6 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors"
          >
            Subscribe Free
          </Link>
        </div>
      </section>
    </div>
  );
}
