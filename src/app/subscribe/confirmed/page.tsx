import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Confirmed",
  description: "You're subscribed to WC26 Live match alerts.",
  alternates: { canonical: "https://wc26live.org/subscribe/confirmed" },
  robots: { index: false, follow: true },
};

export default function ConfirmedPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-8 h-8 text-green-400"
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
      </div>
      <h1 className="text-3xl font-bold mb-4">You&apos;re All Set!</h1>
      <p className="text-[#888] mb-8">
        Thanks for subscribing. You&apos;ll receive match alerts and updates
        straight to your inbox.
      </p>

      {/* Pick'em cross-sell — highest-intent moment */}
      <div className="mb-6 rounded-2xl border border-[#f0a500]/30 bg-gradient-to-br from-[#1a1a2e] to-[#111] p-6 text-left">
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-[#f0a500]">🎯 Also free</div>
        <h2 className="mb-2 text-lg font-bold text-white">Play the World Cup Pick&apos;em</h2>
        <p className="mb-4 text-sm text-[#aaa]">
          Predict match outcomes with <b className="text-white">1,000 free virtual points</b>,
          bet at AI-derived odds, and climb the leaderboard. No money — just bragging rights.
        </p>
        <Link
          href="/predict"
          className="inline-block rounded-lg bg-[#f0a500] px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          Start predicting →
        </Link>
      </div>

      <Link
        href="/"
        className="text-sm text-[#666] hover:text-white transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
