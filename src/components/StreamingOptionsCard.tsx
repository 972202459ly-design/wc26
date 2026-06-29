"use client";

import Link from "next/link";
import { amazonSearchLink } from "@/lib/data";
import { track } from "@/lib/track";

type Props = {
  placement: string;
  title?: string;
  compact?: boolean;
  matchLabel?: string;
};

const primeHref = "https://www.amazon.com/amazonprime?tag=none03e04-20";
const fireTvHref = amazonSearchLink("Fire TV Stick 4K streaming device");

export default function StreamingOptionsCard({
  placement,
  title = "Watch World Cup 2026 online",
  compact = false,
  matchLabel,
}: Props) {
  return (
    <section
      className={`rounded-2xl border border-[#f0a500]/35 bg-gradient-to-br from-[#241a12] via-[#151522] to-[#0d0d14] ${
        compact ? "p-5" : "p-6 sm:p-8"
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f0a500]/80">
            Streaming guide
          </p>
          <h2 className={`${compact ? "text-lg" : "text-2xl"} font-bold text-white`}>
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa]">
            {matchLabel
              ? `Check viewing options before ${matchLabel}. Availability can vary by country and broadcaster.`
              : "Check streaming options, Prime membership offers, and match-day devices before kickoff. Availability can vary by country and broadcaster."}
          </p>
          <p className="mt-2 text-[10px] text-[#666]">
            As an Amazon Associate, WC26 Live may earn from qualifying purchases.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[210px]">
          <a
            href={primeHref}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => track("affiliate_click", undefined, { placement, slot: "prime_membership" })}
            className="rounded-lg bg-[#f0a500] px-4 py-2.5 text-center text-sm font-bold text-black hover:bg-[#d49500]"
          >
            Amazon Prime
          </a>
          <Link
            href="/watch"
            onClick={() => track("watch_guide_click", undefined, { placement })}
            className="rounded-lg border border-[#555] px-4 py-2.5 text-center text-sm font-semibold text-[#ddd] hover:border-[#f0a500] hover:text-white"
          >
            View Streaming Guide
          </Link>
          <a
            href={fireTvHref}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => track("affiliate_click", undefined, { placement, slot: "fire_tv" })}
            className="rounded-lg border border-[#333] px-4 py-2 text-center text-xs font-semibold text-[#aaa] hover:border-[#f0a500]/70 hover:text-white"
          >
            Fire TV & Devices
          </a>
        </div>
      </div>
    </section>
  );
}
