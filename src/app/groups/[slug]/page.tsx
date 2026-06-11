import {
  groups,
  getGroupFromSlug,
  getTeamsByGroup,
  getMatchesByGroup,
  getGroupStandings,
  getGroupSlug,
  getTeamFlagUrl,
  getTeamIdByName,
} from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AdPlaceholder from "@/components/AdPlaceholder";

export function generateStaticParams() {
  return groups.map((g) => ({ slug: getGroupSlug(g) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = getGroupFromSlug(slug);
  if (!group) return { title: "Group Not Found" };

  const groupTeams = getTeamsByGroup(group);
  const teamNames = groupTeams.map((t) => t.name).join(", ");

  return {
    title: `${group} — Standings & Schedule`,
    description: `2026 FIFA World Cup ${group} standings, match schedule, and results for ${teamNames}.`,
    openGraph: {
      title: `${group} — 2026 FIFA World Cup`,
      description: `Live ${group} standings and match schedule for the 2026 World Cup.`,
    },
  };
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = getGroupFromSlug(slug);
  if (!group) notFound();

  const groupTeams = getTeamsByGroup(group);
  const groupMatches = getMatchesByGroup(group);
  const groupStandings = getGroupStandings(group);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-[#888] mb-4">
        <Link href="/groups" className="hover:text-white transition-colors">
          Groups
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">{group}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">
        2026 FIFA World Cup — {group}
      </h1>
      <p className="text-[#888] mb-8">
        Standings, match schedule, and results for {group}.
      </p>

      {/* Standings Table */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Standings</h2>
        <div className="overflow-x-auto rounded-xl border border-[#222]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111] text-[#888] text-xs uppercase tracking-wider">
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Team</th>
                <th className="p-3 text-center">P</th>
                <th className="p-3 text-center">W</th>
                <th className="p-3 text-center">D</th>
                <th className="p-3 text-center">L</th>
                <th className="p-3 text-center">GF</th>
                <th className="p-3 text-center">GA</th>
                <th className="p-3 text-center">GD</th>
                <th className="p-3 text-center font-bold text-white">Pts</th>
              </tr>
            </thead>
            <tbody>
              {groupStandings.map((s) => (
                <tr key={s.team} className="border-t border-[#222] hover:bg-[#111]">
                  <td className="p-3">{s.pos}</td>
                  <td className="p-3 font-medium">
                    <img src={getTeamFlagUrl(getTeamIdByName(s.team) || "")} alt="" className="w-5 h-3.5 inline-block mr-2 align-middle" />
                    {s.team}
                  </td>
                  <td className="p-3 text-center">{s.played}</td>
                  <td className="p-3 text-center">{s.won}</td>
                  <td className="p-3 text-center">{s.drawn}</td>
                  <td className="p-3 text-center">{s.lost}</td>
                  <td className="p-3 text-center">{s.gf}</td>
                  <td className="p-3 text-center">{s.ga}</td>
                  <td className="p-3 text-center">{s.gd}</td>
                  <td className="p-3 text-center font-bold text-white">{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Teams */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Teams</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {groupTeams.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#111] hover:border-[#f0a500]/50 transition-all"
            >
              <div>
                <p className="font-semibold">
                  <img src={getTeamFlagUrl(t.id)} alt="" className="w-5 h-3.5 inline-block mr-2 align-middle" />
                  {t.name}
                </p>
                <p className="text-xs text-[#888]">{t.group}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Matches */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Match Schedule</h2>
        {groupMatches.length === 0 ? (
          <p className="text-[#888]">No matches scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {groupMatches.map((m) => {
              const dateObj = new Date(m.date + "T" + m.time);
              const dateStr = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const timeStr = dateObj
                .toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace(":00", "");
              return (
                <Link
                  key={m.id}
                  href={`/match/${m.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-[#222] bg-[#111] hover:border-[#f0a500]/50 transition-all"
                >
                  <div className="flex-1 text-right font-medium">
                    <img src={getTeamFlagUrl(getTeamIdByName(m.homeTeam) || "")} alt="" className="w-5 h-3.5 inline-block mr-1 align-middle" />
                    {m.homeTeam}
                  </div>
                  <div className="mx-4 text-center min-w-[80px]">
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
                  </div>
                  <div className="flex-1 font-medium">{m.awayTeam}
                    <img src={getTeamFlagUrl(getTeamIdByName(m.awayTeam) || "")} alt="" className="w-5 h-3.5 inline-block ml-1 align-middle" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8">
        <AdPlaceholder size="banner" />
      </div>
    </div>
  );
}
