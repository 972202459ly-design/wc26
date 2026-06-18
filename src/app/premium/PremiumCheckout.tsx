"use client";

import { useEffect, useState } from "react";
import type { Paddle } from "@paddle/paddle-js";

const plans = [
  {
    name: "Tournament Pass",
    price: "$4.99",
    period: " one-time",
    description: "Your edge for the whole tournament — through the July 19 final, no recurring charges",
    features: [
      "🧠 AI Analyst on every match — full breakdown & value picks to win your predictions",
      "🎯 +500 daily Pick'em points (free = 200) — climb the leaderboard faster",
      "⚡ Real-time goal alerts with scorer, the moment they happen",
      "⏰ Kickoff reminders before every match",
      "📊 Detailed post-match summaries",
      "🚫 Completely ad-free",
    ],
    priceId: process.env.NEXT_PUBLIC_PADDLE_TOURNAMENT_PRICE_ID || "",
    popular: true,
  },
];

export default function PremiumCheckout() {
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  useEffect(() => {
    const initPaddle = async () => {
      try {
        const { initializePaddle } = await import("@paddle/paddle-js");
        const instance = await initializePaddle({
          environment:
            process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
              ? "production"
              : "sandbox",
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        });
        if (instance) setPaddle(instance);
      } catch {
        console.warn("Paddle failed to initialize");
      }
    };
    initPaddle();
  }, []);

  const handleCheckout = (priceId: string) => {
    if (!paddle || !priceId) return;
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: "overlay",
        theme: "dark",
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Go Premium</h1>
        <p className="text-lg text-[#888] max-w-xl mx-auto">
          Predict smarter and win the Pick&apos;em leaderboard. Unlock the AI
          analyst on every match, bigger daily points, real-time alerts and an
          ad-free experience — all the way to the final.
        </p>
      </div>

      <div className="grid gap-8 max-w-md mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-xl border p-6 ${
              plan.popular
                ? "border-[#f0a500] bg-[#1a1a2e]"
                : "border-[#222] bg-[#111]"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-[#f0a500] text-black">
                Best Value
              </span>
            )}
            <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
            <div className="mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-[#888] text-sm">{plan.period}</span>
            </div>
            <p className="text-sm text-[#888] mb-4">{plan.description}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="text-sm flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-green-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(plan.priceId)}
              disabled={!paddle}
              className="block w-full text-center px-4 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paddle ? "Get the Tournament Pass — $4.99" : "Loading..."}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <a
          href="/subscribe"
          className="text-sm text-[#888] hover:text-white underline"
        >
          Start with free instead
        </a>
      </div>

    </div>
  );
}
