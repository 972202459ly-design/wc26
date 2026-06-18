"use client";

import { useEffect, useState } from "react";

interface Stats {
  players: number;
  topName: string | null;
  topPoints: number;
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
    <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[#999]">
      <span>🌍 <b className="text-white">{roundDown(stats.players)}</b> players competing worldwide</span>
      {stats.topName && (
        <>
          <span className="text-[#444]">·</span>
          <span>Top score: <b className="text-[#f0a500]">{stats.topPoints.toLocaleString()}</b> ({stats.topName})</span>
        </>
      )}
    </p>
  );
}
