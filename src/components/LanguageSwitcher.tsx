"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "es" : "en";

  const otherPath = locale === "en" ? `/es${pathname}` : pathname;

  return (
    <Link
      href={otherPath}
      className="text-xs font-semibold px-2 py-1 rounded border border-[#333] text-[#888] hover:text-white hover:border-white transition-colors uppercase"
      prefetch={false}
    >
      {otherLocale}
    </Link>
  );
}
