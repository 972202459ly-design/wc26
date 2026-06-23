import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About WC26 Live — Independent World Cup 2026 Fan Site",
  description:
    "WC26 Live is an independent, fan-built tracker for the 2026 FIFA World Cup. Learn who we are, where our match data comes from, and how to get in touch.",
  alternates: { canonical: "https://wc26live.org/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">About WC26 Live</h1>

      <div className="space-y-6 text-[#ccc] leading-relaxed">
        <p>
          <strong className="text-white">WC26 Live</strong> is an independent, fan-built website
          for following the 2026 FIFA World Cup — live scores, the full match schedule, group
          standings, the knockout bracket, team pages, and a free play-for-fun prediction game.
          We&apos;re not affiliated with FIFA or any official football body.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">Where our data comes from</h2>
          <p>
            Fixtures, scores and results are aggregated from public football data providers and
            refreshed throughout each match day. We update match data daily during the tournament
            and as soon as games finish. We do our best to keep everything accurate, but this is an
            unofficial fan site — match data is provided for informational use only. For official
            results, always refer to{" "}
            <a
              href="https://www.fifa.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f0a500] hover:underline"
            >
              FIFA.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">Predictions &amp; the Pick&apos;em game</h2>
          <p>
            Win probabilities and AI match previews are model-generated estimates for entertainment
            — they are <strong className="text-white">not betting odds</strong> and not a betting
            service. Our Pick&apos;em game uses virtual points only; there is no money involved and
            no gambling.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">Email alerts</h2>
          <p>
            If you subscribe, we use your email address only to send the World Cup updates you asked
            for — final scores and match summaries (free), or premium goal alerts and reminders.
            Every email includes a one-click unsubscribe link, and you can opt out at any time. See
            our{" "}
            <Link href="/privacy" className="text-[#f0a500] hover:underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">Contact</h2>
          <p>
            Questions, corrections or feedback? Email us at{" "}
            <a href="mailto:support@wc26live.org" className="text-[#f0a500] hover:underline">
              support@wc26live.org
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/schedule"
          className="rounded-lg bg-[#f0a500] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#d49500]"
        >
          View the schedule
        </Link>
        <Link
          href="/subscribe"
          className="rounded-lg border border-[#444] px-5 py-2.5 text-sm font-semibold text-white hover:border-[#f0a500]"
        >
          Get free alerts
        </Link>
      </div>
    </div>
  );
}
