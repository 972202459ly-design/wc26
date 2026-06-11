import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getServerLocale } from "@/i18n/request";

export default async function NotFound() {
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-8xl font-bold text-[#222] mb-4">{t("code")}</div>
      <h1 className="text-2xl font-bold mb-3">{t("title")}</h1>
      <p className="text-[#888] max-w-md mb-8">
        {t("description")}
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
        >
          {t("goHome")}
        </Link>
        <Link
          href="/schedule"
          className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-[#333] text-white hover:bg-[#1a1a1a] transition-colors"
        >
          {t("viewSchedule")}
        </Link>
      </div>
    </div>
  );
}
