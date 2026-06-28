"use client";

import { matches, amazonSearchLink, liveStatus, matchKickoff } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import type { SocialPreview } from "@/lib/db";
import MatchCard from "@/components/MatchCard";
import AdPlaceholder from "@/components/AdPlaceholder";
import AdSlot from "@/components/AdSlot";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Match } from "@/lib/types";
import { useTranslations } from "next-intl";

interface LiveMatch {
  match_id: string;
  home_team?: string;
  away_team?: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  utc_date?: string;
  stage?: string;
}

// Build a Match from a DB-only fixture row (real knockout matchups that aren't
// in the static skeleton).
function koToMatch(lm: LiveMatch): Match {
  const ko = new Date(lm.utc_date!);
  const date = ko.toISOString().slice(0, 10);
  const time = ko.toISOString().slice(11, 19) + "Z";
  return {
    id: lm.match_id,
    homeTeam: lm.home_team!,
    awayTeam: lm.away_team!,
    homeScore: lm.home_score,
    awayScore: lm.away_score,
    status:
      lm.status === "FINISHED"
        ? "finished"
        : lm.status === "IN_PLAY" || lm.status === "PAUSED"
          ? "live"
          : liveStatus({ date, time } as Match),
    minute: null,
    date,
    time,
    venue: "",
    stage: lm.stage ?? "GROUP_STAGE",
  };
}

function mergeScores(staticMatches: Match[], live: LiveMatch[]): Match[] {
  const map = new Map<string, LiveMatch>();
  for (const lm of live) map.set(lm.match_id, lm);
  return staticMatches.map((m) => {
    const lm = map.get(m.id);
    if (!lm) return { ...m, status: liveStatus(m) };
    return {
      ...m,
      homeScore: lm.home_score ?? m.homeScore,
      awayScore: lm.away_score ?? m.awayScore,
      status:
        lm.status === "FINISHED"
          ? "finished"
          : lm.status === "IN_PLAY" || lm.status === "PAUSED"
            ? "live"
            : liveStatus(m),
    };
  });
}

const isReal = (m: Match) => m.homeTeam !== "tbd" && m.awayTeam !== "tbd";

/** YYYY-MM-DD in the visitor's local timezone. */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Filter = "today" | "upcoming" | "results" | "group" | "knockout";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "results", label: "Results" },
  { key: "group", label: "Group Stage" },
  { key: "knockout", label: "Knockout" },
];

export default function SchedulePage() {
  const [liveScores, setLiveScores] = useState<LiveMatch[] | null>(null);
  const [socialPreviews, setSocialPreviews] = useState<Record<string, SocialPreview>>({});
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [query, setQuery] = useState("");
  const [tzLabel, setTzLabel] = useState("");
  const todayRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("schedule");
  const shopT = useTranslations("schedule.shop");

  // Read initial filter/search from the URL (no Suspense boundary needed).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const f = params.get("f") as Filter | null;
    if (f && FILTERS.some((x) => x.key === f)) setFilter(f);
    const q = params.get("q");
    if (q) setQuery(q);
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZoneName: "shortOffset",
        hour: "numeric",
      }).formatToParts(new Date());
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      setTzLabel(tz ? `${tz} (${off})` : off);
    } catch {
      /* ignore */
    }
  }, []);

  // Reflect filter/search in the URL so views are shareable.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== "upcoming") params.set("f", filter);
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filter, query]);

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => { if (data.matches) setLiveScores(data.matches); })
      .catch(() => {});
    fetch("/api/social-preview")
      .then((r) => r.json())
      .then((data) => setSocialPreviews(data ?? {}))
      .catch(() => {});
  }, []);

  const merged = useMemo(() => {
    const live = liveScores ?? [];
    const base = mergeScores(matches.filter(isReal), live);
    // Append real knockout fixtures that exist only in the DB (their teams
    // weren't known at build time, so they're not in the static skeleton).
    const staticIds = new Set(matches.map((m) => m.id));
    const ko = live
      .filter(
        (lm) =>
          !staticIds.has(lm.match_id) &&
          !!lm.home_team &&
          lm.home_team !== "tbd" &&
          lm.away_team !== "tbd" &&
          !!lm.utc_date
      )
      .map(koToMatch);
    return [...base, ...ko];
  }, [liveScores]);

  const now = new Date();
  const todayStr = localDateStr(now);

  // Apply the active filter, then the team search.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merged.filter((m) => {
      const ko = matchKickoff(m);
      const passFilter =
        filter === "today"
          ? localDateStr(ko) === todayStr
          : filter === "upcoming"
            ? m.status !== "finished"
            : filter === "results"
              ? m.status === "finished"
              : filter === "group"
                ? m.stage === "GROUP_STAGE"
                : /* knockout */ m.stage !== "GROUP_STAGE";
      if (!passFilter) return false;
      if (!q) return true;
      return (
        m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q)
      );
    });
  }, [merged, filter, query, todayStr]);

  // Group by local calendar day; results show most-recent first, others ascending.
  const days = useMemo(() => {
    const byDay = new Map<string, Match[]>();
    for (const m of filtered) {
      const key = localDateStr(matchKickoff(m));
      (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(m);
    }
    const keys = [...byDay.keys()].sort();
    if (filter === "results") keys.reverse();
    return keys.map((k) => ({
      key: k,
      matches: byDay.get(k)!.sort((a, b) => matchKickoff(a).getTime() - matchKickoff(b).getTime()),
    }));
  }, [filtered, filter]);

  const jumpToToday = () => {
    if (filter !== "upcoming" && filter !== "today") setFilter("today");
    setTimeout(() => todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const dayLabel = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">{t("title")}</h1>
      <p className="mb-1 text-xs text-[#666]">{t("disclaimer")}</p>
      {tzLabel && (
        <p className="mb-5 text-xs text-[#777]">🕑 Times shown in your timezone — {tzLabel}</p>
      )}

      {/* Controls: filter tabs, team search, jump-to-today */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f.key
                  ? "border-[#f0a500] bg-[#f0a500]/10 text-[#f0a500]"
                  : "border-[#2a2a2a] bg-[#0d0d0d] text-[#999] hover:border-[#444] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search team…"
            aria-label="Search team"
            className="min-w-[180px] grow rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#f0a500] focus:outline-none sm:grow-0 sm:min-w-[240px]"
          />
          <button
            onClick={jumpToToday}
            className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm font-semibold text-[#ccc] transition-colors hover:border-[#f0a500] hover:text-white"
          >
            Jump to today
          </button>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] py-12 text-center text-[#888]">
          No matches for this view.
        </div>
      ) : (
        days.map((day, idx) => {
          const isToday = day.key === todayStr;
          return (
            <section
              key={day.key}
              ref={isToday ? todayRef : undefined}
              className="mb-8 scroll-mt-20"
            >
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#f0a500]">
                {dayLabel(day.key)}
                {isToday && (
                  <span className="rounded-full bg-[#f0a500] px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                    Today
                  </span>
                )}
              </h2>
              <div className="grid gap-3">
                {day.matches.map((match) => {
                  const pred =
                    match.status === "upcoming"
                      ? predictMatch(match.homeTeam, match.awayTeam)
                      : undefined;
                  return (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={pred ? { homePct: pred.homePct, drawPct: pred.drawPct, awayPct: pred.awayPct } : undefined}
                      social={socialPreviews[match.id]}
                    />
                  );
                })}
              </div>
              {/* Real AdSense unit after the first day's matches (~4th match);
                  inert until AdSense is configured. */}
              {idx === 0 && <AdSlot className="mt-6" />}
              {idx > 0 && idx % 3 === 0 && (
                <div className="mt-6">
                  <AdPlaceholder size="banner" />
                </div>
              )}
            </section>
          );
        })
      )}

      {/* Amazon Affiliate — Match Day Gear */}
      <div className="mt-10 rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-3">
          {shopT("sponsored")}
        </span>
        <h2 className="text-xl font-bold mb-2">{shopT("title")}</h2>
        <p className="text-sm text-[#888] mb-5 max-w-lg mx-auto">
          {shopT("description")}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href={amazonSearchLink("World Cup 2026 jersey")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            {shopT("shopJerseys")}
          </a>
          <a
            href={amazonSearchLink("World Cup 2026 t-shirt")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("tShirts")}
          </a>
          <a
            href={amazonSearchLink("World Cup 2026 hat cap")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("hats")}
          </a>
        </div>
        <p className="text-[10px] text-[#555] mt-3">
          {shopT("affiliateNotice")}
        </p>
      </div>
    </div>
  );
}
