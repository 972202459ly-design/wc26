"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "es" : "en";

  // pathname may carry a locale prefix (e.g. "/es/schedule"); strip it, then
  // prefix the target locale. The proxy sets the NEXT_LOCALE cookie for both
  // /en and /es, so switching works in either direction.
  let path = pathname.replace(/^\/(en|es)(?=\/|$)/, "");
  if (path === "/") path = "";
  const otherPath = `/${otherLocale}${path}`;

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
