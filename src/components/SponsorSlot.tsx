"use client";

import { getSponsor, type SponsorPlacement } from "@/lib/sponsor";
import { track } from "@/lib/track";
import TrackView from "./TrackView";

// Renders a direct sponsor for a placement, or a house ad linking to /advertise
// when the slot is unsold. Records a sponsor_impression when the slot scrolls
// into view and a sponsor_click on tap, so we can report real numbers to the
// advertiser. House-ad impressions are tagged sponsor:"house".
export default function SponsorSlot({ placement }: { placement: SponsorPlacement }) {
  const sponsor = getSponsor(placement);

  if (!sponsor) {
    return (
      <a
        href="/advertise"
        onClick={() => track("sponsor_click", "advertise", { placement, sponsor: "house" })}
        className="relative mx-auto block max-w-3xl rounded-lg border border-dashed border-[#333] bg-[#0f0f0f] px-4 py-3 text-center transition-colors hover:border-[#f0a500]/50"
      >
        <TrackView event="sponsor_impression" source="advertise" props={{ placement, sponsor: "house" }} />
        <span className="text-xs text-[#888]">
          📣 Your brand here on match day — <span className="text-[#f0a500]">advertise to World Cup fans →</span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => track("sponsor_click", "advertise", { placement, sponsor: sponsor.name })}
      className="relative mx-auto block max-w-3xl overflow-hidden rounded-lg border border-[#f0a500]/30 bg-gradient-to-r from-[#1a1a2e] to-[#111] px-5 py-3 transition-colors hover:border-[#f0a500]/60"
    >
      <TrackView event="sponsor_impression" source="advertise" props={{ placement, sponsor: sponsor.name }} />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f0a500]">Sponsor</p>
          <p className="truncate text-sm font-bold text-white">{sponsor.headline}</p>
          <p className="truncate text-[11px] text-white/60">{sponsor.name}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-[#f0a500] px-4 py-2 text-xs font-bold text-black">
          {sponsor.cta} →
        </span>
      </div>
    </a>
  );
}
