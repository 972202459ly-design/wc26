"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { matches } from "@/lib/data";

interface LiveMatch {
  match_id: string;
  home_team?: string;
  away_team?: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

const LIVE_STATUSES = new Set(["IN_PLAY", "LIVE", "PAUSED"]);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function HeroMatchStrip() {
  const [live, setLive] = useState<LiveMatch | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((d) => {
        const arr: LiveMatch[] = d.matches || [];
        setLive(arr.find((m) => LIVE_STATUSES.has(m.status)) || null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Future matches sorted by kickoff — computed once.
  const future = useMemo(
    () =>
      matches
        .map((m) => ({ m, t: new Date(`${m.date}T${m.time}`).getTime() }))
        .sort((a, b) => a.t - b.t),
    []
  );

  // Avoid SSR/CSR hydration mismatch: render nothing until the client effect runs.
  if (!loaded) return null;

  if (live) {
    return (
      <Link
        href={`/match/${live.match_id}`}
        className="mx-auto mb-7 flex w-fit items-center gap-2.5 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:border-green-400"
      >
        <span className="live-dot" />
        <span className="text-green-400">LIVE NOW</span>
        <span className="text-[#ccc]">
          {live.home_team} <b className="text-white">{live.home_score ?? 0}–{live.away_score ?? 0}</b> {live.away_team}
        </span>
        <span className="text-[#888]">→</span>
      </Link>
    );
  }

  const next = future.find((x) => x.t > now);
  if (!next) return null;

  const totalSec = Math.max(0, Math.floor((next.t - now) / 1000));
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const mn = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const clock = days > 0 ? `${days}d ${pad(h)}:${pad(mn)}:${pad(s)}` : `${pad(h)}:${pad(mn)}:${pad(s)}`;

  return (
    <div className="mx-auto mb-7 flex w-fit items-center gap-2.5 rounded-full border border-[#333] bg-black/40 px-4 py-1.5 text-sm">
      <span className="text-[#888]">Next match</span>
      <span className="text-[#ddd]">{next.m.homeTeam} vs {next.m.awayTeam}</span>
      <span className="font-mono font-semibold tabular-nums text-[#f0a500]">{clock}</span>
    </div>
  );
}
