import type { Metadata } from "next";
import Link from "next/link";
import StreamingOptionsCard from "@/components/StreamingOptionsCard";
import { amazonSearchLink } from "@/lib/data";

export const metadata: Metadata = {
  title: "How to Watch World Cup 2026 Online | Streaming Guide",
  description:
    "World Cup 2026 streaming guide with match alerts, TV schedule links, Prime membership options, and match-day device ideas.",
  alternates: { canonical: "https://wc26live.org/watch" },
};

const guideItems = [
  {
    title: "Check your local broadcaster",
    body: "World Cup rights are usually country-specific. Start with the official broadcaster or streaming partner in your country.",
  },
  {
    title: "Compare streaming memberships",
    body: "Some viewers use Prime, live TV apps, sports bundles, or broadcaster apps for tournament coverage and match-day channels.",
  },
  {
    title: "Set up the device early",
    body: "Test your TV, Fire TV, browser, phone, or tablet before kickoff so you are not troubleshooting during the match.",
  },
  {
    title: "Use alerts for kickoff times",
    body: "WC26 Live can help you track schedules, live scores, standings, and match reminders as the tournament moves across time zones.",
  },
];

const faq = [
  {
    q: "Can I watch World Cup 2026 on Amazon Prime?",
    a: "Availability depends on your country, local broadcasters, and Prime Video offerings at the time of the match. Check Prime Video and your local rights holder before kickoff.",
  },
  {
    q: "What is the best way to follow World Cup 2026 online?",
    a: "Use the official broadcaster or streaming provider in your country, then use WC26 Live for schedules, live scores, standings, predictions, and match alerts.",
  },
  {
    q: "Does WC26 Live stream matches?",
    a: "No. WC26 Live provides schedules, scores, standings, predictions, alerts, and viewing guides. It does not host live match video.",
  },
];

export default function WatchPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="mb-8 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#f0a500]">
          World Cup 2026 streaming guide
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
          How to watch World Cup 2026 online
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#aaa]">
          Find kickoff times, check streaming options, compare Prime membership offers, and set up your
          match-day device before the game starts.
        </p>
      </section>

      <div className="mb-8">
        <StreamingOptionsCard placement="watch_page_hero" title="Check Prime and streaming options" />
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        {guideItems.map((item, index) => (
          <div key={item.title} className="rounded-xl border border-[#222] bg-[#111] p-5">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0a500] text-sm font-bold text-black">
              {index + 1}
            </div>
            <h2 className="text-lg font-bold text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#999]">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="mb-8 rounded-2xl border border-[#222] bg-[#101018] p-6">
        <h2 className="text-xl font-bold text-white">Match-day setup ideas</h2>
        <p className="mt-2 text-sm leading-6 text-[#999]">
          A stable streaming device, a clear TV setup, and kickoff reminders matter more than browsing
          at the last minute.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <a
            href={amazonSearchLink("Fire TV Stick 4K streaming device")}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="rounded-lg border border-[#333] bg-[#181818] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]"
          >
            Fire TV Stick 4K
          </a>
          <a
            href={amazonSearchLink("4K smart TV streaming sports")}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="rounded-lg border border-[#333] bg-[#181818] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]"
          >
            4K TV for sports
          </a>
          <a
            href={amazonSearchLink("portable bluetooth speaker outdoor party")}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="rounded-lg border border-[#333] bg-[#181818] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]"
          >
            Watch-party speaker
          </a>
        </div>
        <p className="mt-3 text-[10px] text-[#555]">
          Sponsored links. As an Amazon Associate, WC26 Live may earn from qualifying purchases.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-[#222] bg-[#111] p-6">
        <h2 className="text-xl font-bold text-white">Quick links</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/schedule" className="rounded-lg border border-[#333] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]">
            World Cup schedule
          </Link>
          <Link href="/teams" className="rounded-lg border border-[#333] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]">
            Teams
          </Link>
          <Link href="/subscribe" className="rounded-lg border border-[#333] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]">
            Free match alerts
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">FAQ</h2>
        {faq.map((item) => (
          <details key={item.q} className="rounded-xl border border-[#222] bg-[#111] p-5">
            <summary className="cursor-pointer font-semibold text-white">{item.q}</summary>
            <p className="mt-3 text-sm leading-6 text-[#999]">{item.a}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
