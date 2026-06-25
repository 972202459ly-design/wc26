import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ensureGameSchema, getPlayerAnalytics, type PlayerAnalytics } from "@/lib/db";
import TrackView from "@/components/TrackView";

export const metadata: Metadata = {
  title: "My Prediction Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function pct(n: number): string {
  return (n * 100).toFixed(0) + "%";
}

// Cumulative-net sparkline as an inline SVG polyline. Returns null when there
// isn't enough history to draw a meaningful line.
function Sparkline({ trend }: { trend: { net: number }[] }) {
  if (trend.length < 2) return null;
  const W = 480, H = 120, P = 6;
  let cum = 0;
  const cums = trend.map((t) => (cum += t.net));
  const min = Math.min(0, ...cums);
  const max = Math.max(0, ...cums);
  const span = max - min || 1;
  const x = (i: number) => P + (i / (cums.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const pts = cums.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const zeroY = y(0).toFixed(1);
  const up = cums[cums.length - 1] >= 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none">
      <line x1={P} y1={zeroY} x2={W - P} y2={zeroY} stroke="#333" strokeWidth="1" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-4">
      <div className="text-xs text-[#888]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[#666]">{hint}</div>}
    </div>
  );
}

function Dashboard({ a, isPro }: { a: PlayerAnalytics; isPro: boolean }) {
  const accDelta = a.accuracy - a.siteAccuracy;
  const net = a.netPoints;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Total predictions" value={a.totalPredictions.toLocaleString()} hint={`${a.pending} pending`} />
        <Card
          label="Accuracy"
          value={pct(a.accuracy)}
          hint={
            a.totalPredictions > 0
              ? `${accDelta >= 0 ? "+" : ""}${(accDelta * 100).toFixed(0)} pts vs avg ${pct(a.siteAccuracy)}`
              : "vs site average"
          }
        />
        <Card
          label="Net points"
          value={`${net >= 0 ? "+" : ""}${net.toLocaleString()}`}
          hint={`${a.wins}W · ${a.losses}L`}
        />
        <Card label="Leaderboard rank" value={a.rank ? `#${a.rank}` : "—"} hint={`of ${a.totalPlayers.toLocaleString()} players`} />
        <Card label="Best team" value={a.bestTeam ? a.bestTeam.team : "—"} hint={a.bestTeam ? `${a.bestTeam.wins} correct calls` : "win a pick to set this"} />
        <Card label="Win streak record" value={`${a.wins}`} hint="correct picks all-time" />
      </div>

      {/* Last 10 */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-white">Last 10 results</h2>
        {a.last10.length === 0 ? (
          <p className="text-sm text-[#888]">No settled predictions yet — make a pick and check back after the match.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {a.last10.map((r, i) => (
              <span
                key={i}
                title={`${r.team}: ${r.net >= 0 ? "+" : ""}${r.net} pts`}
                className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                  r.result === "won" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                }`}
              >
                {r.result === "won" ? "W" : "L"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Performance trend — premium feature */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
          Performance trend
          {!isPro && <span className="rounded bg-[#f0a500] px-1.5 py-0.5 text-[10px] font-bold text-black">PRO</span>}
        </h2>
        <div className="relative overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#111] p-4">
          {a.trend.length < 2 ? (
            <p className="text-sm text-[#888]">Your points trend will appear here once you have a couple of settled predictions.</p>
          ) : (
            <>
              <div className={isPro ? "" : "pointer-events-none select-none blur-md"}>
                <Sparkline trend={a.trend} />
                <p className="mt-2 text-center text-[11px] text-[#666]">Cumulative points won/lost across your settled predictions</p>
              </div>
              {!isPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 text-center">
                  <TrackView event="premium_teaser_view" source="account" props={{ feature: "analytics_trend" }} />
                  <p className="max-w-xs px-4 text-sm text-[#ddd]">
                    Unlock your full <b className="text-white">performance trend</b> and per-tournament analytics with Fan Pro.
                  </p>
                  <Link
                    href="/premium?source=account"
                    className="rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Unlock Pro — $7.99 →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-white">My Prediction Analytics</h1>
        <p className="mb-6 text-sm text-[#aaa]">Sign in to see your accuracy, net points, best team and performance trend.</p>
        <Link href="/account" className="inline-block rounded-md bg-[#f0a500] px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90">
          Sign in
        </Link>
      </div>
    );
  }

  await ensureGameSchema();
  const analytics = await getPlayerAnalytics(session.email);
  const isPro = session.tier === "premium";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">My Prediction Analytics</h1>
        <Link href="/account" className="text-sm text-[#888] hover:text-white">
          ← Account
        </Link>
      </div>
      <Dashboard a={analytics} isPro={isPro} />
    </div>
  );
}
