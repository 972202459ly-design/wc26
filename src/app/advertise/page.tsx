import type { Metadata } from "next";
import { ADVERTISE_EMAIL } from "@/lib/sponsor";

export const metadata: Metadata = {
  title: "Advertise on WC26 Live — Reach World Cup Fans",
  description:
    "Sponsor WC26 Live and reach engaged World Cup fans during live match days. Matchday, leaderboard and daily-email sponsorships available.",
  alternates: { canonical: "/advertise" },
};

const TIERS = [
  {
    name: "Matchday Sponsor",
    price: "from $150",
    unit: "/ day",
    blurb: "Your brand on our highest-traffic pages on live match days — when fans are glued to scores and predictions.",
    points: ["Logo + tagline placement on match-day surfaces", "Click-through to your site or offer", "Real impression & click reporting"],
    subject: "Matchday Sponsor enquiry",
    highlight: true,
  },
  {
    name: "Leaderboard Sponsor",
    price: "from $300",
    unit: "/ week",
    blurb: "Premium, persistent placement on the prediction leaderboard fans check every single day of the tournament.",
    points: ["Sponsor strip on the leaderboard", "Always-on for the full week", "Real impression & click reporting"],
    subject: "Leaderboard Sponsor enquiry",
    highlight: false,
  },
  {
    name: "Email Sponsor",
    price: "by reach",
    unit: "negotiated",
    blurb: "One exclusive slot in our daily fan digest. A single sponsor per email — far higher attention than a web banner.",
    points: ["Sole sponsor of a daily send", "Priced by subscriber count", "Link tracking included"],
    subject: "Email Sponsor enquiry",
    highlight: false,
  },
];

export default function AdvertisePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Reach World Cup fans during live match days</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[#aaa]">
          WC26 Live is where fans predict matches, climb the leaderboard and follow live scores all the way to the
          July 19 final. Put your brand in front of them at the moments they care most.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`flex flex-col rounded-2xl border p-5 ${
              t.highlight ? "border-[#f0a500]/60 bg-gradient-to-b from-[#1e1e35] to-[#111]" : "border-[#2a2a2a] bg-[#111]"
            }`}
          >
            <h2 className="text-base font-bold text-white">{t.name}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-[#f0a500]">{t.price}</span>
              <span className="text-xs text-[#888]">{t.unit}</span>
            </div>
            <p className="mt-2 text-xs text-[#aaa]">{t.blurb}</p>
            <ul className="mt-3 flex-1 space-y-1.5">
              {t.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-[#ddd]">
                  <span className="mt-0.5 text-[#f0a500]">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <a
              href={`mailto:${ADVERTISE_EMAIL}?subject=${encodeURIComponent(t.subject)}`}
              className="mt-4 block rounded-lg bg-[#f0a500] px-4 py-2.5 text-center text-sm font-bold text-black hover:opacity-90"
            >
              Enquire →
            </a>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-6 text-center">
        <h2 className="text-lg font-bold text-white">Who advertises with us</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[#aaa]">
          Sports bars and watch-party venues, football kit & merch stores, sports apps, and local match-viewing
          events — anyone who wants to reach an audience of committed World Cup fans.
        </p>
        <p className="mt-4 text-sm text-[#ddd]">
          Questions or a custom package?{" "}
          <a href={`mailto:${ADVERTISE_EMAIL}?subject=${encodeURIComponent("Advertising enquiry")}`} className="font-semibold text-[#f0a500] hover:underline">
            {ADVERTISE_EMAIL}
          </a>
        </p>
        <p className="mt-4 text-[11px] text-[#666]">
          We report real impressions and clicks for every campaign. We don&apos;t sell points, ranks or odds, and all
          sponsored placements are clearly labelled.
        </p>
      </div>
    </div>
  );
}
