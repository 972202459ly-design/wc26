"use client";

import { useState, useEffect } from "react";
import { amazonSearchLink } from "@/lib/data";

export default function AmazonStickyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after 5s, hide after scrolling past 90%
    const showTimer = setTimeout(() => setVisible(true), 5000);
    const handleScroll = () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrolled > 0.85) setVisible(false);
      else if (scrolled < 0.1) setVisible(true);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#f0a500]/30 bg-[#1a1a2e]/95 backdrop-blur-md shadow-[0_-4px_30px_rgba(240,165,0,0.12)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            🏆 Official World Cup Gear
          </p>
          <p className="text-[11px] text-[#888] truncate">
            Best prices on Amazon — jerseys, flags &amp; more
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={amazonSearchLink("World Cup 2026 jersey")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            Shop Jerseys
          </a>
          <a
            href={amazonSearchLink("World Cup 2026 flag")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-600 text-white hover:bg-white/10 transition-colors"
          >
            Flags
          </a>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-[#555] hover:text-white text-lg leading-none shrink-0"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
