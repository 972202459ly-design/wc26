import {
  teams,
  getTeamById,
  getMatchesByTeam,
  getTeamFlagUrl,
  getTeamIdByName,
  amazonSearchLink,
} from "@/lib/data";
import type { Match } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AdPlaceholder from "@/components/AdPlaceholder";
import { getTranslations } from "next-intl/server";
import { getServerLocale } from "@/i18n/request";

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
    description: `${team.name} 2026 FIFA World Cup match schedule, results, live scores, and ${team.group} standings. Follow every ${team.name} fixture on WC26 Live.`,
    alternates: { canonical: `https://wc26live.org/teams/${team.id}` },
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

  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "team" });
  const shopT = await getTranslations({ locale, namespace: "team.shop" });

  const teamMatches = getMatchesByTeam(team.name);
  const teamFlag = getTeamFlagUrl(team.id);

  const upcoming = teamMatches.filter((m) => m.status === "upcoming");
  const finished = teamMatches
    .filter((m) => m.status === "finished")
    .reverse();
  const live = teamMatches.filter((m) => m.status === "live");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SportsTeam",
      name: team.name,
      sport: "Football",
      url: `https://wc26live.org/teams/${team.id}`,
      logo: getTeamFlagUrl(team.id) || undefined,
      memberOf: {
        "@type": "SportsOrganization",
        name: "2026 FIFA World Cup",
        url: "https://wc26live.org",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://wc26live.org/" },
        { "@type": "ListItem", position: 2, name: "Teams", item: "https://wc26live.org/teams" },
        {
          "@type": "ListItem",
          position: 3,
          name: team.name,
          item: `https://wc26live.org/teams/${team.id}`,
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-[#888] mb-4">
        <Link href="/teams" className="hover:text-white transition-colors">
          {t("breadcrumb")}
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
            {t("liveNow")}
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
        <h2 className="text-xl font-semibold mb-4">{t("upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="text-[#888]">{t("noUpcoming")}</p>
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
          <h2 className="text-xl font-semibold mb-4">{t("results")}</h2>
          <div className="space-y-3">
            {finished.map((m) => (
              <MatchCard key={m.id} match={m} team={team.name} />
            ))}
          </div>
        </section>
      )}

      {/* No matches at all */}
      {teamMatches.length === 0 && (
        <p className="text-[#888]">{t("noMatches")}</p>
      )}

      {/* Amazon Affiliate — Team gear */}
      {teamMatches.length > 0 && (
        <div className="mt-8 rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-3">
            {shopT("sponsored")}
          </span>
          <h2 className="text-xl font-bold mb-2">
            {teamFlag && <img src={teamFlag} alt="" className="w-6 h-4 inline-block mr-2 align-middle" />}
            {shopT("getGear", { team: team.name })}
          </h2>
          <p className="text-sm text-[#888] mb-5 max-w-lg mx-auto">
            {shopT("description", { team: team.name })}
          </p>
          <a
            href={amazonSearchLink(`${team.name} jersey World Cup 2026`)}
            target="_blank" rel="noopener noreferrer"
            className="inline-block px-6 py-2.5 text-sm font-bold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            {shopT("shopJerseys", { team: team.name })}
          </a>
          <p className="text-[10px] text-[#555] mt-3">
            {shopT("affiliateNotice")}
          </p>
        </div>
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

  const isHome = m.homeTeam === team;
  const homeFlag = getTeamFlagUrl(getTeamIdByName(m.homeTeam) || "");
  const awayFlag = getTeamFlagUrl(getTeamIdByName(m.awayTeam) || "");
  const hasScore = m.homeScore !== null && m.awayScore !== null;
  const resultText = hasScore ? `${m.homeScore} - ${m.awayScore}` : "Result pending";

  return (
    <Link
      href={`/match/${m.id}`}
      className="flex flex-col gap-3 rounded-xl border border-[#222] bg-[#111] p-4 transition-all hover:border-[#f0a500]/50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <span className="mb-2 inline-flex rounded bg-[#1a1a2e] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#888]">
          {isHome ? "Home" : "Away"}
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-white sm:text-base">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {homeFlag && <img src={homeFlag} alt="" className="h-3.5 w-5 shrink-0 rounded-sm" />}
            <span className={m.homeTeam === team ? "text-white" : "text-[#aaa]"}>
              {m.homeTeam}
            </span>
          </span>
          <span className="text-xs font-bold uppercase text-[#666]">vs</span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {awayFlag && <img src={awayFlag} alt="" className="h-3.5 w-5 shrink-0 rounded-sm" />}
            <span className={m.awayTeam === team ? "text-white" : "text-[#aaa]"}>
              {m.awayTeam}
            </span>
          </span>
        </div>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        {m.status === "finished" ? (
          <span className="text-sm font-semibold text-[#888]">
            {resultText}
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
