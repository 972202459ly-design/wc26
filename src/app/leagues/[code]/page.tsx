import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getLeagueByCode, isMember, memberCount } from "@/lib/leagues";
import SignInForm from "@/components/SignInForm";
import JoinLeagueButton from "@/components/JoinLeagueButton";

export const metadata: Metadata = {
  title: "Join League",
  robots: { index: false, follow: false },
};

export default async function JoinLeaguePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const league = await getLeagueByCode(code);

  if (!league) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mb-2 text-3xl">🔍</div>
        <h1 className="text-xl font-bold text-white">League not found</h1>
        <p className="mt-2 text-sm text-[#aaa]">
          Double-check the invite link or code. It may be mistyped.
        </p>
        <Link href="/leagues" className="mt-5 inline-block text-sm text-[#f0a500]">
          Go to your leagues →
        </Link>
      </div>
    );
  }

  const session = await getSession();
  const count = await memberCount(league.id);
  const full = count >= league.maxMembers;

  // Already a member → straight to the board.
  if (session && (await isMember(league.id, session.email))) {
    redirect(`/leagues/${league.code}/leaderboard`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-[#222] bg-[#111] p-6 text-center">
        <div className="mb-2 text-4xl">{league.emoji || "🏆"}</div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#f0a500]">
          You&apos;re invited to
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">{league.name}</h1>
        <p className="mt-2 text-sm text-[#888]">
          {count} / {league.maxMembers} members · Private World Cup Pick&apos;em
        </p>

        {!league.paid ? (
          <p className="mt-5 rounded-md border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-300">
            This league isn&apos;t active yet — check back once the host completes setup.
          </p>
        ) : full ? (
          <p className="mt-5 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            This league is full.
          </p>
        ) : session ? (
          <div className="mt-6">
            <JoinLeagueButton code={league.code} />
            <p className="mt-2 text-[11px] text-[#666]">Free to join — no payment needed.</p>
          </div>
        ) : (
          <div className="mt-6 text-left">
            <p className="mb-3 text-center text-sm text-[#aaa]">
              Sign in (free) to join and start predicting.
            </p>
            <SignInForm />
          </div>
        )}
      </div>
    </div>
  );
}
