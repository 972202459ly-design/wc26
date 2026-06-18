"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Paywall from "./Paywall";

interface Pred {
  homePct: number;
  drawPct: number;
  awayPct: number;
  lambdaHome: number;
  lambdaAway: number;
  topHome: number;
  topAway: number;
  pick: "home" | "draw" | "away";
}

// Representative (not real) numbers shown blurred behind the paywall.
const TEASER: Pred = {
  homePct: 54, drawPct: 27, awayPct: 19,
  lambdaHome: 1.8, lambdaAway: 1.0, topHome: 2, topAway: 1, pick: "home",
};

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#ccc]">{label}</span>
        <span className="font-semibold text-white">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#222]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Bars({ home, away, p }: { home: string; away: string; p: Pred }) {
  const pickText =
    p.pick === "home" ? `${home} to win` : p.pick === "away" ? `${away} to win` : "Draw";
  return (
    <div>
      <Bar label={home} pct={p.homePct} color="#f0a500" />
      <Bar label="Draw" pct={p.drawPct} color="#6b7280" />
      <Bar label={away} pct={p.awayPct} color="#3498db" />
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#999]">
        <span>Expected goals: <span className="text-white">{p.lambdaHome} – {p.lambdaAway}</span></span>
        <span>Most likely: <span className="text-white">{p.topHome}–{p.topAway}</span></span>
        <span>Model pick: <span className="font-semibold text-[#f0a500]">{pickText}</span></span>
      </div>
    </div>
  );
}

export default function MatchPrediction({
  matchId,
  home,
  away,
}: {
  matchId: string;
  home: string;
  away: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "locked" | "error">("loading");
  const [data, setData] = useState<{ prediction: Pred; analysis: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/predictions/${matchId}`)
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 403) return setState("locked");
        if (!r.ok) return setState("error");
        const d = await r.json();
        if (!alive) return;
        setData(d);
        setState("ok");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [matchId]);

  if (state === "error") return null;

  return (
    <section className="mx-auto mt-6 max-w-3xl px-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#f0a500]" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-white">
          AI Match Prediction
        </h2>
      </div>

      {state === "loading" && (
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-2 animate-pulse rounded-full bg-[#222]" />
            ))}
          </div>
        </div>
      )}

      {state === "locked" && (
        <Paywall
          teaser={
            <div className="bg-[#111] p-5">
              <Bars home={home} away={away} p={TEASER} />
            </div>
          }
          title="See who the AI model favors"
          description={`Unlock the win probability, expected goals and a full AI breakdown for ${home} vs ${away} — plus the qualification simulator and real-time alerts.`}
        />
      )}

      {state === "ok" && data && (
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
          <Bars home={home} away={away} p={data.prediction} />
          {data.analysis && (
            <p className="mt-4 border-t border-[#222] pt-4 text-sm leading-relaxed text-[#ddd]">
              {data.analysis}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
