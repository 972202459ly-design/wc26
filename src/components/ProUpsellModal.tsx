"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Sparkles, Bell, BarChart3 } from "lucide-react";
import { track } from "@/lib/track";

// High-intent upsell shown right after a free player saves a prediction — the
// moment they've shown they value the game. Fires a teaser-view event on mount
// and a CTA-click event on the upgrade tap so the funnel attributes Pro orders
// to this surface. The caller is responsible for the once-per-day cap and for
// never mounting this for Pro users.
export default function ProUpsellModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    track("premium_teaser_view", "post_prediction", { product: "fan_pro" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const perks = [
    { icon: Sparkles, text: "Full AI match breakdown & value picks on every match" },
    { icon: Bell, text: "Instant goal & kickoff alerts — never miss a chance to predict" },
    { icon: BarChart3, text: "Your personal prediction analytics for the whole tournament" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#f0a500]/40 bg-[#111] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-green-400">✓</span> Prediction saved
        </div>
        <p className="mb-4 text-sm text-[#aaa]">
          You&apos;re in the game. Go <b className="text-[#f0a500]">Fan Pro</b> to predict smarter for the
          rest of the tournament:
        </p>

        <ul className="mb-5 space-y-2.5">
          {perks.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-sm text-[#ddd]">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#f0a500]" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/premium?source=post_prediction"
          onClick={() =>
            track("premium_cta_click", "post_prediction", { product: "fan_pro" })
          }
          className="block w-full rounded-lg bg-[#f0a500] px-4 py-2.5 text-center text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          Unlock Pro — $7.99 →
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-lg py-2 text-center text-sm text-[#888] hover:text-white"
        >
          Not now
        </button>

        <p className="mt-3 text-center text-[11px] text-[#555]">
          One payment · all the way to the July 19 final · not a subscription
        </p>
      </div>
    </div>
  );
}
