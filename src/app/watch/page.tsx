import type { Metadata } from "next";
import Link from "next/link";
import StreamingOptionsCard from "@/components/StreamingOptionsCard";
import WatchSetupLinks from "@/components/WatchSetupLinks";

export const metadata: Metadata = {
  title: "How to Watch World Cup 2026 in the USA | TV & Streaming Guide",
  description:
    "USA-focused World Cup 2026 watching guide with kickoff times, official TV and streaming checklist, Prime and Fire TV setup ideas, devices, and match-day tips.",
  alternates: { canonical: "https://wc26live.org/watch" },
};

const guideItems = [
  {
    title: "Check the U.S. TV listing",
    body: "Start with the official U.S. broadcaster and streaming provider for the match, then use WC26 Live for kickoff time, score and schedule context.",
  },
  {
    title: "Confirm your streaming setup",
    body: "Before kickoff, make sure your official streaming provider, browser, phone, or TV device is ready and signed in.",
  },
  {
    title: "Use the match page before kickoff",
    body: "Open the match page for live score, pre-match briefing, stars to watch, and a direct How to Watch block for that fixture.",
  },
  {
    title: "Set reminders for U.S. time zones",
    body: "World Cup kickoff times can be awkward across the U.S. Use the schedule and alerts so you do not miss early or late matches.",
  },
];

const faq = [
  {
    q: "How can I watch World Cup 2026 in the USA?",
    a: "Use the official U.S. broadcaster or streaming provider for match video. WC26 Live helps you find kickoff times, live scores, match previews, schedules, and watch setup links.",
  },
  {
    q: "Can I watch World Cup 2026 on Amazon Prime?",
    a: "Prime is not listed here as the primary U.S. World Cup live-rights platform. Availability depends on U.S. rights, Prime Video offerings, and the official broadcaster package at the time of the match, so check the official rights holder before kickoff.",
  },
  {
    q: "Does WC26 Live stream matches?",
    a: "No. WC26 Live provides schedules, scores, standings, pre-match previews, alerts, and viewing guides. It does not host live match video.",
  },
  {
    q: "What should I set up before match day?",
    a: "Confirm your streaming provider, test your TV or device, check kickoff time in your U.S. time zone, and open WC26 Live for live score and match updates.",
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
          USA World Cup 2026 watch guide
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
          How to watch World Cup 2026 in the USA
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#aaa]">
          Find kickoff times, check official TV and streaming options, compare Prime and Fire TV setup ideas, and set up your
          match-day device before the game starts.
        </p>
      </section>

      <div className="mb-8">
        <StreamingOptionsCard placement="watch_page_hero" title="Check U.S. streaming and match-day setup" />
      </div>

      <section className="mb-8 rounded-2xl border border-[#f0a500]/25 bg-[#111] p-6">
        <h2 className="text-xl font-bold text-white">Fast path for U.S. viewers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/schedule" className="rounded-lg border border-[#333] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]">
            Games today and kickoff times
          </Link>
          <Link href="/teams/usa" className="rounded-lg border border-[#333] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]">
            Follow USA matches
          </Link>
          <Link href="/bracket" className="rounded-lg border border-[#333] p-4 text-sm font-semibold text-[#ddd] hover:border-[#f0a500]">
            Knockout bracket
          </Link>
        </div>
      </section>

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
          A stable streaming device, a clear TV setup, and kickoff reminders matter more than searching
          for options at the last minute.
        </p>
        <WatchSetupLinks placement="watch_page_setup" />
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
