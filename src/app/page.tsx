import Link from "next/link";
import { getMergedMatches } from "@/lib/data";
import MatchCard from "@/components/MatchCard";

export const revalidate = 60;

export default async function HomePage() {
  const allMatches = await getMergedMatches();
  const today = new Date().toISOString().split("T")[0];
  const todayMatches = allMatches.filter((m) => m.date === today);
  const upcomingMatches = allMatches
    .filter((m) => m.status === "upcoming" && m.date !== today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 6);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl sm:text-6xl font-bold mb-4">
            2026 FIFA World Cup
          </h1>
          <p className="text-lg text-[#888] mb-8">
            Hosted across the United States, Canada, and Mexico. 48 teams. One
            trophy.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/schedule"
              className="px-6 py-3 text-sm font-semibold rounded-lg border border-gray-600 text-white hover:bg-white/10 transition-colors"
            >
              View Schedule
            </Link>
            <Link
              href="/standings"
              className="px-6 py-3 text-sm font-semibold rounded-lg border border-gray-600 text-white hover:bg-white/10 transition-colors"
            >
              Standings
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Nav Cards */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: "/schedule", label: "Schedule", desc: "Full match schedule" },
            { href: "/standings", label: "Standings", desc: "Group standings" },
            { href: "/teams", label: "Teams", desc: "All 48 teams" },
            { href: "/subscribe", label: "Subscribe", desc: "Free match alerts" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="p-4 rounded-xl border border-[#3a3a5e] bg-[#1e1e35] hover:border-[#f0a500] hover:bg-[#2a2a4e] transition-all"
            >
              <h3 className="font-semibold text-white">{card.label}</h3>
              <p className="text-sm text-[#888] mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Today's Matches */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold mb-4">Today&apos;s Matches</h2>
        {todayMatches.length > 0 ? (
          <div className="grid gap-3">
            {todayMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#111] rounded-xl border border-[#222]">
            <p className="text-[#888]">
              No matches scheduled for today. The tournament kicks off on June
              11, 2026.
            </p>
          </div>
        )}
      </section>

      {/* Upcoming Matches */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold mb-4">Upcoming Matches</h2>
        <div className="grid gap-3">
          {upcomingMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#222] py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">Never Miss a Goal</h2>
          <p className="text-[#888] mb-6">
            Get real-time goal alerts, match reminders, and daily digests
            delivered to your inbox. Free.
          </p>
          <Link
            href="/subscribe"
            className="inline-block px-6 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors"
          >
            Subscribe Free
          </Link>
        </div>
      </section>
    </div>
  );
}
