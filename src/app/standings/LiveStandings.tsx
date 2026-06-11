"use client";

import { StandingEntry, TeamInfo } from "@/lib/types";
import { useEffect, useState } from "react";
import { getTeamFlagUrl, getTeamIdByName } from "@/lib/data";
import AdPlaceholder from "@/components/AdPlaceholder";

interface LiveMatch {
  api_id: number;
  match_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  stage: string | null;
  group_name: string | null;
  utc_date: string;
}

interface GroupTable {
  group: string;
  teams: StandingEntry[];
}

function computeStandingsFrom(matches: LiveMatch[]): GroupTable[] {
  const groupMap = new Map<string, Map<string, StandingEntry>>();

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    if (!m.group_name || m.stage !== "GROUP_STAGE") continue;

    const group = m.group_name.replace("GROUP_", "Group ");
    if (!groupMap.has(group)) groupMap.set(group, new Map());

    const teams = groupMap.get(group)!;
    for (const [name, gf, ga, isHome] of [[m.home_team, m.home_score, m.away_score, true] as const, [m.away_team, m.away_score, m.home_score, false] as const]) {
      if (!teams.has(name)) {
        teams.set(name, {
          pos: 0,
          team: name,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
        });
      }
      const t = teams.get(name)!;
      t.played++;
      t.gf += gf!;
      t.ga += ga!;
      if (gf! > ga!) t.won++, t.pts += 3;
      else if (gf! < ga!) t.lost++;
      else t.drawn++, t.pts++;
    }
  }

  for (const teams of groupMap.values()) {
    for (const t of teams.values()) {
      t.gd = t.gf - t.ga;
    }
  }

  const groups: GroupTable[] = [];
  for (const [group, teams] of groupMap.entries()) {
    const sorted = [...teams.values()].sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.gd !== b.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    sorted.forEach((t, i) => (t.pos = i + 1));
    groups.push({ group, teams: sorted });
  }

  groups.sort((a, b) => a.group.localeCompare(b.group));
  return groups;
}

export default function LiveStandings({
  initialStandings,
  initialTeams,
}: {
  initialStandings: StandingEntry[];
  initialTeams: TeamInfo[];
}) {
  const [liveGroups, setLiveGroups] = useState<GroupTable[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => {
        if (data.matches?.length) {
          setLiveGroups(computeStandingsFrom(data.matches));
        }
      })
      .catch(() => {
        // fallback to static
      })
      .finally(() => setLoading(false));
  }, []);

  // Use live data if available, otherwise fall back to static
  const displayGroups = liveGroups ?? (() => {
    // Group static standings by their group
    const map = new Map<string, StandingEntry[]>();
    for (const s of initialStandings) {
      const team = initialTeams.find((t) => t.name === s.team);
      const g = team?.group ?? "Group A";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(s);
    }
    return [...map.entries()]
      .map(([group, teams]) => ({ group, teams }))
      .sort((a, b) => a.group.localeCompare(b.group));
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Group Standings</h1>
      {loading && liveGroups === null && (
        <p className="text-sm text-[#888] mb-6">Loading live scores...</p>
      )}
      {liveGroups && (
        <p className="text-sm text-green-400 mb-6">
          Live — auto-updating from official FIFA data
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {displayGroups.map(({ group, teams }) => (
          <div
            key={group}
            className="rounded-xl border border-[#222] bg-[#111] overflow-hidden"
          >
            <div className="px-4 py-3 bg-[#1a1a2e] border-b border-[#222]">
              <h2 className="font-semibold">{group}</h2>
            </div>
            {teams.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#666]">
                No matches played yet
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#888] uppercase tracking-wider">
                    <th className="text-left px-4 py-2 w-8">#</th>
                    <th className="text-left px-2 py-2">Team</th>
                    <th className="text-center px-2 py-2">P</th>
                    <th className="text-center px-2 py-2">W</th>
                    <th className="text-center px-2 py-2">D</th>
                    <th className="text-center px-2 py-2">L</th>
                    <th className="text-center px-2 py-2">GD</th>
                    <th className="text-center px-2 py-2 font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((entry) => (
                    <tr
                      key={entry.team}
                      className="border-t border-[#222] hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td className="px-4 py-3 text-[#888]">{entry.pos}</td>
                      <td className="px-2 py-3 font-medium">
                        <img src={getTeamFlagUrl(getTeamIdByName(entry.team) || "")} alt="" className="w-5 h-3.5 inline-block mr-2 align-middle" />
                        {entry.team}
                      </td>
                      <td className="text-center px-2 py-3">{entry.played}</td>
                      <td className="text-center px-2 py-3 text-green-400">
                        {entry.won}
                      </td>
                      <td className="text-center px-2 py-3 text-yellow-400">
                        {entry.drawn}
                      </td>
                      <td className="text-center px-2 py-3 text-red-400">
                        {entry.lost}
                      </td>
                      <td
                        className={`text-center px-2 py-3 font-medium ${
                          entry.gd > 0
                            ? "text-green-400"
                            : entry.gd < 0
                              ? "text-red-400"
                              : ""
                        }`}
                      >
                        {entry.gd > 0 ? "+" : ""}
                        {entry.gd}
                      </td>
                      <td className="text-center px-2 py-3 font-bold">
                        {entry.pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <AdPlaceholder size="banner" />
      </div>
    </div>
  );
}
