import { matches } from "@/lib/data";
import MatchCard from "@/components/MatchCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match Schedule",
  description: "Full 2026 FIFA World Cup match schedule with dates, times, and venues.",
};

const matchDays = [...new Set(matches.map((m) => m.date))].sort();

export default function SchedulePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Match Schedule</h1>

      {matchDays.map((date) => {
        const dayMatches = matches.filter((m) => m.date === date);
        return (
          <section key={date} className="mb-8">
            <h2 className="text-lg font-semibold text-[#f0a500] mb-3">
              {new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <div className="grid gap-3">
              {dayMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
