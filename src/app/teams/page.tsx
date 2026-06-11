import { groups, teams } from "@/lib/data";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams",
  description: "All 48 teams competing in the 2026 FIFA World Cup.",
};

export default function TeamsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Teams</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/match?team=${encodeURIComponent(team.name)}`}
            className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#111] hover:border-[#f0a500]/50 transition-all"
          >
            <div>
              <p className="font-semibold">{team.name}</p>
              <p className="text-xs text-[#888]">{team.group}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
