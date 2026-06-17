"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface MatchEvent {
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "var";
  team: "home" | "away";
  player?: string | null;
  assist?: string | null;
  detail?: string;
}

interface TimelineProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  isFinished: boolean;
  isLive: boolean;
}

const ICONS: Record<MatchEvent["type"], string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔁",
  var: "📺",
};

function eventText(evt: MatchEvent): string {
  const who = evt.player || "—";
  switch (evt.type) {
    case "goal": {
      const kind = /own goal/i.test(evt.detail || "")
        ? " (own goal)"
        : /penalty/i.test(evt.detail || "")
          ? " (penalty)"
          : "";
      const assist = evt.assist ? ` — assist: ${evt.assist}` : "";
      return `Goal! ${who}${kind}${assist}`;
    }
    case "yellow_card":
      return `Yellow card — ${who}`;
    case "red_card":
      return `Red card — ${who}`;
    case "substitution":
      return `Substitution — ${who} on${evt.assist ? `, ${evt.assist} off` : ""}`;
    case "var":
      return `VAR — ${evt.detail || "review"}`;
    default:
      return who;
  }
}

export default function EventsTimeline({
  matchId,
  homeTeam,
  awayTeam,
  isFinished,
  isLive,
}: TimelineProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("match.timeline");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(`/api/match/${matchId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.events)) setEvents(data.events);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

    load();
    // Live text commentary: refresh every 30s while the match is in play.
    const interval = isLive ? setInterval(load, 30000) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [matchId, isLive]);

  if (loading) return null;
  if (events.length === 0 && !isFinished && !isLive) return null;

  // Newest first for a live-feed feel.
  const ordered = [...events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="mt-8 rounded-xl border border-[#222] bg-[#111] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#f0a500] uppercase tracking-wider">
          {t("title")}
        </h3>
        {isLive && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-400">
            <span className="live-dot" /> LIVE
          </span>
        )}
      </div>

      {ordered.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-2 opacity-30">⚽</div>
          <p className="text-sm text-[#666]">{isLive ? t("waiting") : t("noEvents")}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {ordered.map((evt, i) => {
            const isHome = evt.team === "home";
            return (
              <div
                key={`${evt.minute}-${i}`}
                className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
                  evt.type === "goal" ? "bg-[#f0a500]/10" : "hover:bg-white/5"
                }`}
              >
                <span className="text-xs font-mono text-[#888] min-w-[3ch] pt-0.5">
                  {evt.minute}&apos;
                </span>
                <span className="text-base leading-none pt-0.5">{ICONS[evt.type]}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm ${
                      evt.type === "goal" ? "font-semibold text-white" : "text-[#ddd]"
                    }`}
                  >
                    {eventText(evt)}
                  </div>
                  <div className="text-[11px] text-[#666]">{isHome ? homeTeam : awayTeam}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
