import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getUserLeagues } from "@/lib/leagues";
import SignInForm from "@/components/SignInForm";

export const metadata: Metadata = {
  title: "Private Leagues",
  description:
    "Run a private World Cup Pick'em for friends, coworkers or your watch party. Create a league, invite your group, and crown your own champion.",
};

export default async function LeaguesPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-white">Private Leagues</h1>
        <p className="mb-6 text-sm text-[#aaa]">
          Sign in to create a private World Cup Pick&apos;em for your friends, coworkers or watch
          party — or to join one you were invited to.
        </p>
        <SignInForm />
      </div>
    );
  }

  let leagues: Awaited<ReturnType<typeof getUserLeagues>> = [];
  try {
    leagues = await getUserLeagues(session.email);
  } catch {
    /* schema may not exist yet */
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Leagues</h1>
          <p className="mt-1 text-sm text-[#aaa]">
            Private World Cup Pick&apos;em for your group.
          </p>
        </div>
        <Link
          href="/leagues/create"
          className="shrink-0 rounded-lg bg-[#f0a500] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
        >
          Create a Private League
        </Link>
      </div>

      {leagues.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-8 text-center">
          <div className="mb-2 text-3xl">🏆</div>
          <h2 className="text-lg font-bold text-white">Run a private World Cup Pick&apos;em</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#aaa]">
            Create a league for friends, coworkers or your watch party. Everyone predicts, you crown
            your own champion.
          </p>
          <Link
            href="/leagues/create"
            className="mt-5 inline-block rounded-lg bg-[#f0a500] px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
          >
            Create a Private League
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link
                href={`/leagues/${l.code}/leaderboard`}
                className="flex items-center justify-between rounded-xl border border-[#222] bg-[#111] p-4 transition-colors hover:border-[#f0a500]/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{l.emoji || "🏆"}</span>
                    <span className="truncate font-semibold text-white">{l.name}</span>
                    {l.role === "owner" && (
                      <span className="rounded bg-[#f0a500]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f0a500]">
                        Host
                      </span>
                    )}
                    {!l.paid && (
                      <span className="rounded bg-yellow-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-300">
                        Pending payment
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-[#888]">
                    {l.members} / {l.maxMembers} members · code {l.code}
                  </div>
                </div>
                <span className="shrink-0 text-sm text-[#f0a500]">View →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
