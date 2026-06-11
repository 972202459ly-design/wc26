import {
  teams,
  getTeamById,
  getMatchesByTeam,
  getTeamFlagUrl,
  getTeamIdByName,
} from "@/lib/data";
import type { Match } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AdPlaceholder from "@/components/AdPlaceholder";

export function generateStaticParams() {
  return teams.map((t) => ({ id: t.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const team = getTeamById(id);
  if (!team) return { title: "Team Not Found" };

  return {
    title: `${team.name} — 2026 World Cup Schedule & Results`,
    description: `${team.name} 2026 FIFA World Cup match schedule, results, and group stage information. ${team.group}.`,
    openGraph: {
      title: `${team.name} — 2026 FIFA World Cup`,
      description: `Follow ${team.name} in the 2026 World Cup. Match schedule, live scores, and results.`,
    },
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = getTeamById(id);
  if (!team) notFound();

  const teamMatches = getMatchesByTeam(team.name);
  const teamFlag = getTeamFlagUrl(team.id);

  const upcoming = teamMatches.filter((m) => m.status === "upcoming");
  const finished = teamMatches
    .filter((m) => m.status === "finished")
    .reverse();
  const live = teamMatches.filter((m) => m.status === "live");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-[#888] mb-4">
        <Link href="/teams" className="hover:text-white transition-colors">
          Teams
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">{team.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {teamFlag && <img src={teamFlag} alt="" className="w-7 h-5 inline-block mr-2 align-middle" />}
          {team.name}
        </h1>
        <p className="text-[#888]">
          <Link
            href={`/groups/${team.group.replace("Group ", "").toLowerCase()}`}
            className="text-[#f0a500] hover:underline"
          >
            {team.group}
          </Link>{" "}
          — 2026 FIFA World Cup
        </p>
      </div>

      {/* Live matches */}
      {live.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-green-400">
            Live Now
          </h2>
          <div className="space-y-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} team={team.name} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming matches */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Upcoming Matches</h2>
        {upcoming.length === 0 ? (
          <p className="text-[#888]">No upcoming matches.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} team={team.name} />
            ))}
          </div>
        )}
      </section>

      {/* Finished matches */}
      {finished.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <div className="space-y-3">
            {finished.map((m) => (
              <MatchCard key={m.id} match={m} team={team.name} />
            ))}
          </div>
        </section>
      )}

      {/* No matches at all */}
      {teamMatches.length === 0 && (
        <p className="text-[#888]">No matches found for this team.</p>
      )}

      <div className="mt-8">
        <AdPlaceholder size="banner" />
      </div>
    </div>
  );
}

function MatchCard({
  match: m,
  team,
}: {
  match: Match;
  team: string;
}) {
  const dateObj = new Date(m.date + "T" + m.time);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = dateObj
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    .replace(":00", "");

  const opponent = m.homeTeam === team ? m.awayTeam : m.homeTeam;
  const isHome = m.homeTeam === team;
  const oppId = getTeamIdByName(opponent) || "";
  const oppFlag = getTeamFlagUrl(oppId);

  return (
    <Link
      href={`/match/${m.id}`}
      className="flex items-center justify-between p-4 rounded-xl border border-[#222] bg-[#111] hover:border-[#f0a500]/50 transition-all"
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-xs px-2 py-0.5 rounded bg-[#1a1a2e] text-[#888] uppercase">
          {isHome ? "H" : "A"}
        </span>
        <span className="font-semibold">vs {oppFlag && <img src={oppFlag} alt="" className="w-5 h-3.5 inline-block mr-1 align-baseline" />}{opponent}</span>
      </div>
      <div className="text-right">
        {m.status === "finished" && m.homeScore !== null ? (
          <span className="text-lg font-bold text-white">
            {m.homeScore} — {m.awayScore}
          </span>
        ) : (
          <>
            <div className="text-xs text-[#888]">{dateStr}</div>
            <div className="text-xs text-[#888]">{timeStr}</div>
          </>
        )}
        <div className="text-xs text-[#555] uppercase">{m.stage.replace("_", " ")}</div>
      </div>
    </Link>
  );
}
