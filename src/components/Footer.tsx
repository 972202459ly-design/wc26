import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getServerLocale } from "@/i18n/request";

export default async function Footer() {
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "footer" });

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="font-bold text-lg mb-3">{t("brand")}</h3>
            <p className="text-sm text-[#888] leading-relaxed">
              {t("description")}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">
              {t("linksTitle")}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("home")}
              </Link>
              <Link
                href="/schedule"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("schedule")}
              </Link>
              <Link
                href="/standings"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("standings")}
              </Link>
              <Link
                href="/simulator"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                Simulator
              </Link>
              <Link
                href="/groups"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("groups")}
              </Link>
              <Link
                href="/teams"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("teams")}
              </Link>
              <Link
                href="/about"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("about")}
              </Link>
              <Link
                href="/subscribe"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("getAlerts")}
              </Link>
              <Link
                href="/advertise"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                Advertise
              </Link>
            </div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mt-4 mb-3">
              {t("legalTitle")}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/tos"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("tos")}
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/refund"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("refund")}
              </Link>
              <Link
                href="/premium"
                className="text-sm text-[#888] hover:text-white transition-colors"
              >
                {t("pricing")}
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">
              {t("disclaimerTitle")}
            </h4>
            <p className="text-xs text-[#888] leading-relaxed">
              {t("disclaimerText")}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[#777]">
              As an Amazon Associate, WC26 Live earns from qualifying purchases.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[#888]">
          <p className="mb-1 text-[#666]">{t("updatedDaily")}</p>
          {t("copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
