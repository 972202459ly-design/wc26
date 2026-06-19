"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Lock, Users } from "lucide-react";

interface NextMatch {
  id: string;
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
  utc_date: string;
  stage: string;
  isLive: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
  prediction?: { homePct: number; drawPct: number; awayPct: number };
  preview?: { teaser: string | null; full: string | null; locked: boolean };
  predictorCount?: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function FeaturedNextMatch() {
  const [m, setM] = useState<NextMatch | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/next-match")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.id) setM(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const kickoffMs = useMemo(() => (m ? new Date(m.utc_date).getTime() : 0), [m]);

  if (!loaded || !m) return null;

  const matchUrl = `/match/${m.id}`;
  const Flag = ({ src }: { src: string }) =>
    src ? <img src={src} alt="" width={36} height={27} className="rounded-sm shadow" /> : null;

  // ── Live state ──
  if (m.isLive) {
    return (
      <section className="mx-auto -mt-4 mb-12 max-w-2xl px-4">
        <Link
          href={matchUrl}
          className="block rounded-2xl border border-green-500/40 bg-gradient-to-br from-[#10241a] to-[#0e0e0e] p-6 text-center transition-colors hover:border-green-400"
        >
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
            <span className="live-dot" /> Live Now
          </div>
          <div className="flex items-center justify-center gap-4 text-2xl font-bold text-white sm:text-3xl">
            <span className="flex items-center gap-2"><Flag src={m.homeFlag} /> {m.home}</span>
            <span className="text-green-400">{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
            <span className="flex items-center gap-2">{m.away} <Flag src={m.awayFlag} /></span>
          </div>
          <div className="mt-3 text-sm text-[#aaa]">Watch live commentary &amp; scores →</div>
        </Link>
      </section>
    );
  }

  // ── Upcoming state: countdown + AI preview + social proof ──
  const diff = Math.max(0, Math.floor((kickoffMs - now) / 1000));
  const days = Math.floor(diff / 86400);
  const clock = `${days > 0 ? days + "d " : ""}${pad(Math.floor((diff % 86400) / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`;
  const pred = m.prediction;
  const rows = pred
    ? [
        { label: m.home, pct: pred.homePct, color: "#f0a500" },
        { label: "Draw", pct: pred.drawPct, color: "#6b7280" },
        { label: m.away, pct: pred.awayPct, color: "#3498db" },
      ]
    : [];

  return (
    <section className="mx-auto -mt-4 mb-12 max-w-2xl px-4">
      <div className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a2e] to-[#0e0e0e]">
        {/* Header: label + countdown */}
        <div className="flex items-center justify-between border-b border-[#222] px-6 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#f0a500]">⚽ Next Match</span>
          <span className="font-mono text-sm font-bold tabular-nums text-white">{clock}</span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-center gap-4 px-6 py-6 text-2xl font-bold text-white sm:text-3xl">
          <span className="flex items-center gap-2.5"><Flag src={m.homeFlag} /> {m.home}</span>
          <span className="text-base font-normal text-[#666]">vs</span>
          <span className="flex items-center gap-2.5">{m.away} <Flag src={m.awayFlag} /></span>
        </div>
        {m.stage && <div className="-mt-3 pb-3 text-center text-xs text-[#777]">{m.stage}</div>}

        {/* AI win probability */}
        {rows.length > 0 && (
          <div className="space-y-2 px-6 pb-5">
            {rows.map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-[#ccc]">{r.label}</span>
                  <span className="font-semibold text-white">{r.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#222]">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI preview — teaser free, full text gated behind sign-in */}
        {m.preview?.teaser && (
          <div className="border-t border-[#222] px-6 py-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#f0a500]">
              <Sparkles className="h-3.5 w-3.5" /> AI Match Preview
            </div>
            <p className="text-sm leading-relaxed text-[#ddd]">
              {m.preview.full ?? m.preview.teaser}
            </p>
            {m.preview.locked && (
              <Link
                href={matchUrl}
                className="mt-3 flex items-center gap-2.5 rounded-lg bg-[#0f0f0f] px-4 py-3 transition-colors hover:bg-[#161616]"
              >
                <Lock className="h-4 w-4 shrink-0 text-[#f0a500]" />
                <span className="text-sm text-[#bbb]">
                  <b className="text-white">Sign in free</b> to read the full preview &amp; what to watch →
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Social proof + CTA */}
        <div className="flex flex-col items-center gap-3 border-t border-[#222] bg-black/30 px-6 py-5 text-center">
          <div className="flex items-center gap-1.5 text-sm text-[#aaa]">
            <Users className="h-4 w-4 text-[#f0a500]" />
            {m.predictorCount && m.predictorCount > 0 ? (
              <span><b className="text-white">{m.predictorCount.toLocaleString()}</b> players already predicted this match</span>
            ) : (
              <span>Be the first to predict this match!</span>
            )}
          </div>
          <Link
            href={matchUrl}
            className="rounded-lg bg-[#f0a500] px-7 py-3 text-sm font-bold text-black transition-colors hover:bg-[#d49500]"
          >
            Make Your Prediction →
          </Link>
        </div>
      </div>
    </section>
  );
}
