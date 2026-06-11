import { groups, teams, getGroupSlug, getTeamFlagUrl } from "@/lib/data";
import Link from "next/link";
import type { Metadata } from "next";
import AdPlaceholder from "@/components/AdPlaceholder";

export const metadata: Metadata = {
  title: "Groups",
  description: "2026 FIFA World Cup group standings and schedules — all 12 groups.",
};

export default function GroupsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Groups</h1>
      <p className="text-[#888] mb-8">2026 FIFA World Cup — 12 groups, 48 teams</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const groupTeams = teams.filter((t) => t.group === group);
          return (
            <Link
              key={group}
              href={`/groups/${getGroupSlug(group)}`}
              className="block p-5 rounded-xl border border-[#222] bg-[#111] hover:border-[#f0a500]/50 transition-all"
            >
              <h2 className="text-lg font-bold mb-2">{group}</h2>
              <div className="flex flex-wrap gap-1.5">
                {groupTeams.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#1a1a2e] text-[#ccc]"
                  >
                    <img src={getTeamFlagUrl(t.id)} alt="" className="w-4 h-3 inline-block" />
                    {t.name}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <AdPlaceholder size="banner" />
      </div>
    </div>
  );
}
