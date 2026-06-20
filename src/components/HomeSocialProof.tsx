"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TopTeam {
  name: string;
  fans: number;
  flag: string;
}
interface Stats {
  players: number;
  topName: string | null;
  topPoints: number;
  topTeam: TopTeam | null;
}

// Rounds 126 -> "120+", 1539 -> "1,500+" for an honest-but-tidy figure.
function roundDown(n: number) {
  if (n < 10) return String(n);
  const mag = n < 100 ? 10 : n < 1000 ? 50 : 500;
  return `${(Math.floor(n / mag) * mag).toLocaleString()}+`;
}

export default function HomeSocialProof() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  if (!stats || stats.players === 0) return null;

  return (
    <div className="mt-6 space-y-3 text-sm">
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[#999]">
        <span>🌍 <b className="text-white">{roundDown(stats.players)}</b> players competing worldwide</span>
        {stats.topName && (
          <>
            <span className="text-[#444]">·</span>
            <span>Top score <b className="text-[#f0a500]">{stats.topPoints.toLocaleString()}</b></span>
          </>
        )}
      </p>
      {stats.topTeam && (
        <p className="text-[#999]">
          🔥 <b className="text-white">{stats.topTeam.fans.toLocaleString()}</b> fans backing{" "}
          <b className="text-white">{stats.topTeam.name}</b> — whose side are you on?
        </p>
      )}
      <Link
        href="/predict"
        className="mx-auto inline-block rounded-lg bg-[#f0a500] px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
      >
        Join free — 1,000 points to start →
      </Link>
    </div>
  );
}
