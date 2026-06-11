"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Paddle: any;
  }
}

const plans = [
  {
    name: "Monthly Pass",
    price: "$2.99",
    period: "/month",
    description: "Perfect for casual fans",
    features: [
      "Real-time goal alerts",
      "Match reminders",
      "Post-match summaries",
      "Daily digest",
      "Ad-free experience",
    ],
    priceId:
      process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID || "pri_monthly_fallback",
    popular: false,
  },
  {
    name: "Tournament Pass",
    price: "$19.99",
    period: " one-time",
    description: "Best value for dedicated fans",
    features: [
      "Everything in Monthly Pass",
      "Full tournament coverage",
      "Priority support",
      "No recurring charges",
    ],
    priceId:
      process.env.NEXT_PUBLIC_PADDLE_TOURNAMENT_PRICE_ID ||
      "pri_tournament_fallback",
    popular: true,
  },
];

export default function PremiumPage() {
  useEffect(() => {
    document.title =
      "Premium - WC26 Live";
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (window.Paddle && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) {
        window.Paddle.Initialize({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCheckout = (priceId: string) => {
    if (!window.Paddle) return;
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      allowLogout: false,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Go Premium</h1>
        <p className="text-lg text-[#888] max-w-xl mx-auto">
          Never miss a moment. Get real-time goal alerts, match reminders, and
          more delivered straight to your inbox.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
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
              className="block w-full text-center px-4 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors"
            >
              Subscribe Now
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
