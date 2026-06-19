import Link from "next/link";
import type { Metadata } from "next";
import { getKnockoutBracket, eventPerformers, type BracketMatch } from "@/lib/data";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "World Cup 2026 Bracket — Knockout Stage Schedule & Results",
  description:
    "Full FIFA World Cup 2026 knockout bracket: Round of 16, quarter-finals, semi-finals and the final. Live dates, times and results as the bracket fills in.",
  alternates: { canonical: "https://wc26live.org/bracket" },
  openGraph: {
    title: "World Cup 2026 Bracket — Knockout Stage",
    description:
      "Round of 16 through the final. Follow the 2026 World Cup knockout bracket live.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "World Cup 2026 Bracket",
    description: "Knockout stage bracket, schedule and live results.",
  },
};

function formatDay(date: string): string {
  if (!date) return "TBD";
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

function MatchRow({ m }: { m: BracketMatch }) {
  const isTBD = m.homeTeam === "TBD" || m.awayTeam === "TBD";
  const hasScore = m.homeScore !== null && m.awayScore !== null;
  const isLive = m.status === "live";

  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#222] bg-[#111] px-4 py-3 transition-colors hover:border-[#444]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{m.homeTeam}</span>
          <span className="shrink-0 text-sm tabular-nums text-[#ccc]">
            {hasScore ? m.homeScore : ""}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{m.awayTeam}</span>
          <span className="shrink-0 text-sm tabular-nums text-[#ccc]">
            {hasScore ? m.awayScore : ""}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-400/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
            <span className="live-dot" /> LIVE
          </span>
        ) : m.status === "finished" ? (
          <span className="text-[10px] font-semibold uppercase text-[#666]">FT</span>
        ) : (
          <span className="text-[11px] text-[#888]">
            {formatDay(m.date)}
            {m.time ? ` · ${m.time.slice(0, 5)}` : ""}
          </span>
        )}
      </div>
    </div>
  );

  if (isTBD || m.id === "tbd-tbd") return inner;
  return (
    <Link href={`/match/${m.id}`} className="block">
      {inner}
    </Link>
  );
}

export default async function BracketPage() {
  const rounds = await getKnockoutBracket();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "FIFA World Cup 2026 — Knockout Stage",
    description:
      "Round of 16, quarter-finals, semi-finals, third-place play-off and final of the 2026 FIFA World Cup.",
    sport: "Football",
    startDate: "2026-06-28T00:00:00",
    endDate: "2026-07-19T23:59:59",
    url: "https://wc26live.org/bracket",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: ["https://wc26live.org/opengraph-image"],
    location: {
      "@type": "Place",
      name: "United States, Canada & Mexico",
      address: { "@type": "PostalAddress", addressCountry: "US" },
    },
    organizer: { "@type": "Organization", name: "FIFA", url: "https://www.fifa.com" },
    performer: eventPerformers,
    offers: {
      "@type": "Offer",
      url: "https://wc26live.org/bracket",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: "2026-06-11T00:00:00",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">
            World Cup 2026 Knockout Bracket
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#888]">
            The road to the final at MetLife Stadium on July 19, 2026. Fixtures
            fill in with real teams as the group stage concludes — scores update
            live.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rounds.map((round) => (
            <section key={round.key}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#f0a500]">
                {round.label}
              </h2>
              <div className="space-y-2">
                {round.matches.length ? (
                  round.matches.map((m, i) => (
                    <MatchRow key={`${round.key}-${m.id}-${i}`} m={m} />
                  ))
                ) : (
                  <p className="text-sm text-[#666]">To be confirmed.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
