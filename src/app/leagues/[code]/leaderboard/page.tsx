import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getLeagueByCode, isMember, getLeagueLeaderboard } from "@/lib/leagues";
import InviteShare from "@/components/InviteShare";

export const metadata: Metadata = {
  title: "League Leaderboard",
  robots: { index: false, follow: false },
};

export default async function LeagueLeaderboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const league = await getLeagueByCode(code);
  if (!league) redirect("/leagues");

  const session = await getSession();
  if (!session) redirect(`/leagues/${code}`);
  const member = await isMember(league.id, session.email);
  if (!member) redirect(`/leagues/${code}`);

  const isOwner = session.email.toLowerCase().trim() === league.ownerEmail.toLowerCase().trim();
  const rows = await getLeagueLeaderboard(league.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-3xl">{league.emoji || "🏆"}</span>
        <div>
          <h1 className="text-2xl font-bold text-white">{league.name}</h1>
          <p className="text-xs text-[#888]">
            {rows.length} / {league.maxMembers} members · Private league
          </p>
        </div>
      </div>

      {isOwner && <InviteShare code={league.code} isOwner />}

      <div className="overflow-hidden rounded-xl border border-[#222]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#111] text-left text-xs uppercase tracking-wide text-[#888]">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Player</th>
              <th className="px-4 py-2.5 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const me = r.email.toLowerCase() === session.email.toLowerCase();
              return (
                <tr
                  key={r.email}
                  className={`border-t border-[#1a1a1a] ${me ? "bg-[#f0a500]/5" : ""}`}
                >
                  <td className="px-4 py-2.5 font-mono text-[#888]">{r.rank}</td>
                  <td className="px-4 py-2.5 font-medium text-white">
                    {r.name}
                    {r.isOwner && (
                      <span className="ml-2 rounded bg-[#f0a500]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f0a500]">
                        Host
                      </span>
                    )}
                    {me && <span className="ml-2 text-[11px] text-[#888]">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">
                    {r.points.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/predict" className="text-[#f0a500]">
          Make your predictions →
        </Link>
        <Link href="/leagues" className="text-[#888] hover:text-white">
          All your leagues
        </Link>
      </div>
    </div>
  );
}
