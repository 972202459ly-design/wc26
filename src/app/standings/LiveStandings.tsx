"use client";

import Link from "next/link";
import { StandingEntry, TeamInfo } from "@/lib/types";
import { useEffect, useState } from "react";
import { getTeamFlagUrl, getTeamIdByName, amazonSearchLink } from "@/lib/data";
import AdPlaceholder from "@/components/AdPlaceholder";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("standings");
  const h = useTranslations("standings.tableHeaders");
  const shopT = useTranslations("standings.shop");

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
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="mb-4 text-xs text-[#666]">{t("disclaimer")}</p>
      {loading && liveGroups === null && (
        <p className="text-sm text-[#888] mb-6">{t("loading")}</p>
      )}
      {liveGroups && (
        <p className="text-sm text-green-400 mb-6">
          {t("liveBadge")}
        </p>
      )}

      <Link
        href="/simulator"
        className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[#f0a500]/30 bg-gradient-to-r from-[#1a1a2e] to-[#111] px-5 py-3 transition-colors hover:border-[#f0a500]/60"
      >
        <span className="text-sm text-[#ddd]">
          <b className="text-white">Build your bracket.</b> Pick every knockout winner and chase leaderboard rewards.
        </span>
        <span className="shrink-0 text-sm font-semibold text-[#f0a500]">Open →</span>
      </Link>

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
                {t("noMatches")}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#888] uppercase tracking-wider">
                    <th className="text-left px-4 py-2 w-8">{h("pos")}</th>
                    <th className="text-left px-2 py-2">{h("team")}</th>
                    <th className="text-center px-2 py-2">{h("played")}</th>
                    <th className="text-center px-2 py-2">{h("won")}</th>
                    <th className="text-center px-2 py-2">{h("drawn")}</th>
                    <th className="text-center px-2 py-2">{h("lost")}</th>
                    <th className="text-center px-2 py-2">{h("gd")}</th>
                    <th className="text-center px-2 py-2 font-bold">{h("pts")}</th>
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

      {/* Amazon Affiliate — Top Teams Gear */}
      <div className="mt-10 rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-3">
          {shopT("sponsored")}
        </span>
        <h2 className="text-xl font-bold mb-2">{shopT("title")}</h2>
        <p className="text-sm text-[#888] mb-5 max-w-lg mx-auto">
          {shopT("description")}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href={amazonSearchLink("Brazil jersey 2026 World Cup")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            {shopT("brazil")}
          </a>
          <a
            href={amazonSearchLink("Argentina jersey 2026 World Cup")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("argentina")}
          </a>
          <a
            href={amazonSearchLink("Germany jersey 2026 World Cup")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("germany")}
          </a>
          <a
            href={amazonSearchLink("France jersey 2026 World Cup")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("france")}
          </a>
          <a
            href={amazonSearchLink("England jersey 2026 World Cup")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("england")}
          </a>
        </div>
        <a
          href={amazonSearchLink("World Cup 2026 fan gear")}
          target="_blank" rel="noopener noreferrer"
          className="inline-block mt-3 px-6 py-2 text-xs font-bold rounded-lg border border-[#f0a500]/40 text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors"
        >
          {shopT("browseAll")}
        </a>
        <p className="text-[10px] text-[#555] mt-3">
          {shopT("affiliateNotice")}
        </p>
      </div>

      <div className="mt-8">
        <AdPlaceholder size="banner" />
      </div>
    </div>
  );
}
