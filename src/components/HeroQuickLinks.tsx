"use client";

import Link from "next/link";
import { track } from "@/lib/track";

export interface HeroQuickLink {
  href: string;
  label: string;
}

export default function HeroQuickLinks({ links }: { links: HeroQuickLink[] }) {
  return (
    <nav aria-label="Quick links" className="mx-auto mb-6 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => track("quick_nav_click", "homepage", { href: link.href, label: link.label })}
          className="rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-[#f0a500] hover:text-[#f0a500]"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
