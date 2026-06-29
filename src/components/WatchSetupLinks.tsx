"use client";

import { amazonSearchLink } from "@/lib/data";
import { track } from "@/lib/track";

const items = [
  {
    label: "Prime / Fire TV setup",
    href: "https://www.amazon.com/amazonprime?tag=none03e04-20",
    slot: "prime_membership",
  },
  {
    label: "Fire TV Stick 4K",
    href: amazonSearchLink("Fire TV Stick 4K streaming device"),
    slot: "fire_tv",
  },
  {
    label: "4K TV for sports",
    href: amazonSearchLink("4K smart TV streaming sports"),
    slot: "4k_tv",
  },
  {
    label: "Watch-party speaker",
    href: amazonSearchLink("portable bluetooth speaker outdoor party"),
    slot: "speaker",
  },
];

export default function WatchSetupLinks({ placement }: { placement: string }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <a
          key={item.slot}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => track("affiliate_click", "watch_page", { placement, slot: item.slot })}
          className="rounded-lg border border-[#333] bg-[#181818] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
