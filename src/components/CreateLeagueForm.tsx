"use client";

import { useEffect, useState } from "react";
import type { Paddle } from "@paddle/paddle-js";
import { track } from "@/lib/track";

// Tier is driven by expected group size: up to 30 → League Host ($14.99),
// 31–100 → League Host 100 ($29.99). Both are one-time and include Fan Pro.
const TIERS = {
  host30: { max: 30, price: "$14.99", label: "League Host" },
  host100: { max: 100, price: "$29.99", label: "League Host 100" },
} as const;

export default function CreateLeagueForm() {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [name, setName] = useState("");
  const [expected, setExpected] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier: keyof typeof TIERS = expected > 30 ? "host100" : "host30";
  const plan = TIERS[tier];

  useEffect(() => {
    (async () => {
      try {
        const { initializePaddle } = await import("@paddle/paddle-js");
        const instance = await initializePaddle({
          environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        });
        if (instance) setPaddle(instance);
      } catch {
        console.warn("Paddle failed to initialize");
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Give your league a name (at least 2 characters).");
      return;
    }
    if (!paddle) {
      setError("Checkout is still loading — try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      // 1) Create the draft league, get its id + the matching Paddle price.
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create the league.");
        setBusy(false);
        return;
      }
      if (!data.priceId) {
        setError("League checkout isn’t configured yet. Please try again later.");
        setBusy(false);
        return;
      }

      // 2) Pay. The webhook flips the league to paid and unlocks the invite.
      track("premium_cta_click", "league", { product: "league_host", tier });
      track("checkout_started", "league", { product: "league_host", tier });
      paddle.Checkout.open({
        items: [{ priceId: data.priceId, quantity: 1 }],
        customData: { source: "league", product: "league_host", leagueId: String(data.league.id) },
        settings: {
          displayMode: "overlay",
          theme: "dark",
          successUrl: `${window.location.origin}/leagues/${data.league.code}/leaderboard?created=1`,
        },
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white">League name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="The Office Cup"
          className="w-full rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#f0a500] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-white">
          How many people? <span className="text-[#888]">({expected})</span>
        </label>
        <input
          type="range"
          min={2}
          max={100}
          value={expected}
          onChange={(e) => setExpected(Number(e.target.value))}
          className="w-full accent-[#f0a500]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-[#666]">
          <span>2</span>
          <span>up to 30 · $14.99</span>
          <span>100</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#f0a500]/30 bg-[#1a1a2e] p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">{plan.label}</span>
          <span className="text-xl font-bold text-[#f0a500]">{plan.price}</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-[#aaa]">
          <li>✓ Up to {plan.max} members</li>
          <li>✓ Invite link &amp; join code</li>
          <li>✓ Private leaderboard</li>
          <li>✓ Includes Fan Pro for you (the host)</li>
        </ul>
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !paddle}
        className="w-full rounded-lg bg-[#f0a500] px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Opening checkout…" : `Create league — ${plan.price}`}
      </button>
      <p className="text-center text-[11px] text-[#666]">
        One-time payment. No recurring charges. Invitees join free.
      </p>
    </form>
  );
}
