"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { amazonSearchLink } from "@/lib/data";
import { track } from "@/lib/track";

// Rotate between two Amazon affiliate CTAs — match-day gear, no streaming-rights
// claims.
const SLOTS = [
  {
    emoji: "▶",
    headline: "Streaming setup",
    sub: "Prime & Fire TV options",
    href: "https://www.amazon.com/amazonprime?tag=none03e04-20",
    btn: "Check",
    btnStyle: "bg-[#f0a500] text-black hover:bg-[#d49500]",
  },
  {
    emoji: "🎉",
    headline: "Watch Party Essentials",
    sub: "Speakers, snacks & party supplies",
    href: null, // dynamic per page
    btn: "Shop Now",
    btnStyle: "bg-[#f0a500] text-black hover:bg-[#d49500]",
  },
] as const;

export default function AmazonStickyBar() {
  const [visible, setVisible] = useState(false);
  const [slotIdx, setSlotIdx] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Rotate slot every 12s.
    const rotateTimer = setInterval(() => setSlotIdx((i) => (i + 1) % SLOTS.length), 12000);

    // Stay hidden until the visitor is at least 30% down the page, so the hero
    // and primary match content are never covered on entry. Hide again near the
    // very bottom (footer/CTA area).
    const handleScroll = () => {
      const y = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? y / max : 0;
      if (ratio < 0.3) setVisible(false);
      else if (ratio > 0.9) setVisible(false);
      else setVisible(true);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      clearInterval(rotateTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!visible) return null;

  const slot = SLOTS[slotIdx];

  // Build contextual watch party URL for the gear slot
  let gearHref = amazonSearchLink("soccer watch party supplies decorations");
  if (slot.href === null) {
    // On a match page, surface the relevant streaming gear
    const matchM = pathname.match(/\/match\/([a-z]+)-([a-z]+)/);
    if (matchM) {
      gearHref = amazonSearchLink("soccer watch party speaker snacks");
    }
  }

  const href = slot.href ?? gearHref;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#f0a500]/20 bg-[#1a1a2e]/96 backdrop-blur-md shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="text-xl shrink-0">{slot.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate leading-tight">
            {slot.headline}
          </p>
          <p className="text-[10px] text-[#888] truncate">
            {slot.sub} · Sponsored
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => track("affiliate_click", undefined, { placement: "sticky_bar", slot: slot.headline })}
          className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${slot.btnStyle}`}
        >
          {slot.btn}
        </a>
        <button
          onClick={() => setVisible(false)}
          className="text-[#555] hover:text-white text-lg leading-none shrink-0 ml-1"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
