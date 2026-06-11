import { groups, teams, getTeamFlagUrl, amazonSearchLink } from "@/lib/data";
import Link from "next/link";
import type { Metadata } from "next";
import AdPlaceholder from "@/components/AdPlaceholder";
import { getTranslations } from "next-intl/server";
import { getServerLocale } from "@/i18n/request";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "teams" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function TeamsPage() {
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "teams" });
  const shopT = await getTranslations({ locale, namespace: "teams.shop" });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className="flex items-center gap-3 p-4 rounded-xl border border-[#222] bg-[#111] hover:border-[#f0a500]/50 transition-all"
          >
            <img src={getTeamFlagUrl(team.id)} alt="" className="w-6 h-4.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{team.name}</p>
              <p className="text-xs text-[#888]">{team.group}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <AdPlaceholder size="banner" />
      </div>

      {/* Amazon Affiliate — Fan Gear */}
      <div className="mt-8 rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-3">
          {shopT("sponsored")}
        </span>
        <h2 className="text-xl font-bold mb-2">{shopT("title")}</h2>
        <p className="text-sm text-[#888] mb-5 max-w-lg mx-auto">
          {shopT("description")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
          <a
            href={amazonSearchLink("World Cup 2026 jersey")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            {shopT("jerseys")}
          </a>
          <a
            href={amazonSearchLink("World Cup 2026 scarf")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("scarves")}
          </a>
          <a
            href={amazonSearchLink("World Cup 2026 flag")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("flags")}
          </a>
          <a
            href={amazonSearchLink("soccer ball size 5 official match")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("balls")}
          </a>
        </div>
        <p className="text-[10px] text-[#555] mt-3">
          {shopT("affiliateNotice")}
        </p>
      </div>
    </div>
  );
}
