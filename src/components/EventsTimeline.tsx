"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface MatchEvent {
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution";
  team: "home" | "away";
  player?: string;
  detail?: string;
}

interface TimelineProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  isFinished: boolean;
  isLive: boolean;
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
    fetch(`/api/match/${matchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.events?.length) {
          setEvents(data.events);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) return null;
  if (events.length === 0 && !isFinished && !isLive) return null;

  return (
    <div className="mt-8 rounded-xl border border-[#222] bg-[#111] p-5">
      <h3 className="text-sm font-semibold text-[#f0a500] uppercase tracking-wider mb-4">
        {t("title")}
      </h3>

      {events.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-2 opacity-30">⚽</div>
          <p className="text-sm text-[#666]">
            {isLive
              ? t("waiting")
              : t("noEvents")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((evt, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#888] min-w-[3ch]">
                {evt.minute}&apos;
              </span>
              <span className="text-sm">{evt.player || evt.detail || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
