"use client";

import { amazonSearchLink } from "@/lib/data";
import { track } from "@/lib/track";

const ADS = {
  prime: {
    img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=900&q=80",
    eyebrow: "MATCH DAY",
    headline: "Get ready for match day",
    sub: "Streaming devices & watch-party gear on Amazon",
    cta: "Shop on Amazon →",
    href: amazonSearchLink("4K streaming device tv"),
    ctaStyle: "bg-[#f0a500] hover:bg-[#d49500] text-black",
    gradient: "from-black/80 via-black/50 to-transparent",
  },
  party: {
    img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
    eyebrow: "WATCH PARTY",
    headline: "Set Up the Ultimate Fan Zone",
    sub: "Bluetooth speakers, snacks & soccer décor on Amazon",
    cta: "Shop Now →",
    href: amazonSearchLink("soccer watch party supplies speaker bluetooth"),
    ctaStyle: "bg-[#f0a500] hover:bg-[#d49500] text-black",
    gradient: "from-black/80 via-black/60 to-black/20",
  },
} as const;

export default function AmazonImageAd({ variant }: { variant: "prime" | "party" }) {
  const ad = ADS[variant];
  return (
    <a
      href={ad.href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => track("affiliate_click", undefined, { placement: "image_ad", variant })}
      className="group relative mx-6 mb-4 block overflow-hidden rounded-xl border border-white/5"
      style={{ height: 110 }}
    >
      {/* Background image */}
      <img
        src={ad.img}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      {/* Dark overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${ad.gradient}`} />

      {/* Content */}
      <div className="relative flex h-full items-center justify-between px-5 gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#f0a500] mb-0.5">
            {ad.eyebrow}
          </p>
          <p className="text-sm font-bold text-white leading-tight line-clamp-1">
            {ad.headline}
          </p>
          <p className="text-[11px] text-white/60 mt-0.5 line-clamp-1">
            {ad.sub}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${ad.ctaStyle}`}
        >
          {ad.cta}
        </span>
      </div>

      {/* Sponsored tag */}
      <span className="absolute bottom-1.5 right-2.5 text-[8px] text-white/25 uppercase tracking-widest">
        Sponsored
      </span>
    </a>
  );
}
