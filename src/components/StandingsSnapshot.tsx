"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTeamFlagUrl, getTeamIdByName } from "@/lib/data";

interface LiveMatch {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  stage: string | null;
  group_name: string | null;
}

interface Row {
  team: string;
  played: number;
  pts: number;
  gd: number;
  gf: number;
}

interface GroupLeader {
  group: string;
  rows: Row[];
}

// Compute the top two of each group from finished/in-progress fixtures. Mirrors
// the standings page logic but trimmed to what a homepage snapshot needs.
function computeLeaders(matches: LiveMatch[]): GroupLeader[] {
  const groupMap = new Map<string, Map<string, Row>>();
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    if (!m.group_name || m.stage !== "GROUP_STAGE") continue;
    const group = m.group_name.replace("GROUP_", "Group ");
    if (!groupMap.has(group)) groupMap.set(group, new Map());
    const teams = groupMap.get(group)!;
    for (const [name, gf, ga] of [
      [m.home_team, m.home_score, m.away_score] as const,
      [m.away_team, m.away_score, m.home_score] as const,
    ]) {
      if (!teams.has(name)) teams.set(name, { team: name, played: 0, pts: 0, gd: 0, gf: 0 });
      const t = teams.get(name)!;
      t.played++;
      t.gf += gf;
      t.gd += gf - ga;
      if (gf > ga) t.pts += 3;
      else if (gf === ga) t.pts += 1;
    }
  }

  const leaders: GroupLeader[] = [];
  for (const [group, teams] of groupMap.entries()) {
    const rows = [...teams.values()]
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      .slice(0, 2);
    leaders.push({ group, rows });
  }
  leaders.sort((a, b) => a.group.localeCompare(b.group));
  return leaders;
}

function flag(team: string) {
  const url = getTeamFlagUrl(getTeamIdByName(team) || "");
  return url ? (
    <img src={url} alt="" className="inline-block w-4 h-3 mr-1.5 align-baseline" />
  ) : null;
}

export default function StandingsSnapshot() {
  const [leaders, setLeaders] = useState<GroupLeader[] | null>(null);

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => {
        if (data.matches?.length) setLeaders(computeLeaders(data.matches));
        else setLeaders([]);
      })
      .catch(() => setLeaders([]));
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 pb-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Group Standings</h2>
        <Link href="/standings" className="text-sm text-[#f0a500] hover:underline">
          Full standings →
        </Link>
      </div>

      {leaders && leaders.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leaders.slice(0, 6).map(({ group, rows }) => (
            <Link
              key={group}
              href={`/groups/${group.replace("Group ", "").toLowerCase()}`}
              className="rounded-xl border border-[#222] bg-[#111] p-4 transition-colors hover:border-[#f0a500]/40"
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#888]">
                {group}
              </div>
              <ul className="space-y-1.5">
                {rows.map((r, i) => (
                  <li key={r.team} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      <span className="mr-1.5 text-[#666]">{i + 1}</span>
                      {flag(r.team)}
                      {r.team}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-white">{r.pts}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      ) : (
        <Link
          href="/standings"
          className="block rounded-xl border border-[#222] bg-[#111] p-6 text-center text-sm text-[#888] transition-colors hover:border-[#f0a500]/40"
        >
          Group tables update as matches finish — view the full live standings →
        </Link>
      )}
    </section>
  );
}
