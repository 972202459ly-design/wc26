import { standings, teams } from "@/lib/data";
import type { Metadata } from "next";
import LiveStandings from "./LiveStandings";

export const metadata: Metadata = {
  title: "Group Standings",
  description: "Live group standings for the 2026 FIFA World Cup.",
};

export default function StandingsPage() {
  return <LiveStandings initialStandings={standings} initialTeams={teams} />;
}
