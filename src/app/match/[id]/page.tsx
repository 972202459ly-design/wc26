import { getMatchById, matches } from "@/lib/data";
import { notFound } from "next/navigation";
import MatchDetail from "./MatchDetail";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return matches.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = getMatchById(id);
  if (!match) return {};

  const hasScore =
    match.homeScore !== null && match.awayScore !== null;
  const scoreStr = hasScore
    ? `${match.homeScore}-${match.awayScore}`
    : "vs";
  const statusTag =
    match.status === "live"
      ? " 🔴 LIVE"
      : match.status === "finished"
      ? " (FT)"
      : "";

  return {
    title: `${match.homeTeam} ${scoreStr} ${match.awayTeam}${statusTag}`,
    description: `${match.stage} match: ${match.homeTeam} vs ${match.awayTeam} at ${match.venue}. Follow live scores, stats, and updates on WC26 Live.`,
    openGraph: {
      title: `${match.homeTeam} ${scoreStr} ${match.awayTeam} | WC26 Live`,
      description: `${match.stage} — ${match.venue}. Follow live!`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${match.homeTeam} ${scoreStr} ${match.awayTeam}`,
      description: `${match.stage} at ${match.venue}.`,
    },
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getMatchById(id);
  if (!match) notFound();

  return <MatchDetail match={match} />;
}
