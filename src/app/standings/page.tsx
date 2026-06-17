import { standings, teams } from "@/lib/data";
import type { Metadata } from "next";
import LiveStandings from "./LiveStandings";

export const metadata: Metadata = {
  title: "World Cup 2026 Standings — Live Group Tables",
  description:
    "Live 2026 FIFA World Cup standings and group tables — points, goal difference and qualification for all 12 groups, updated as matches finish.",
  alternates: { canonical: "https://wc26live.org/standings" },
};

export default function StandingsPage() {
  return <LiveStandings initialStandings={standings} initialTeams={teams} />;
}
