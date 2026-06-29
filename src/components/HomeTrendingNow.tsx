"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { track } from "@/lib/track";
import type { TrendingItem } from "@/lib/trending";

export default function HomeTrendingNow({ items }: { items: TrendingItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8">
      <div className="rounded-xl border border-[#2a2a2a] bg-[#101014] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#f0a500]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">Trending Now</h2>
          </div>
          <Link
            href="/watch"
            onClick={() => track("watch_guide_click", "homepage", { placement: "trending_header" })}
            className="text-xs font-semibold text-[#f0a500] hover:text-white"
          >
            Watch guide
          </Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              onClick={() =>
                track("trending_click", "homepage", {
                  rank: index + 1,
                  href: item.href,
                  title: item.title,
                })
              }
              className="group flex min-h-[76px] gap-3 rounded-lg border border-[#222] bg-[#0b0b0f] p-3 transition-colors hover:border-[#f0a500]/70 hover:bg-[#151515]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f0a500] text-xs font-black text-black">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-5 text-white group-hover:text-[#f0a500]">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs text-[#777]">{item.label}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
