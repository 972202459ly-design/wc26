"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/schedule", label: t("schedule") },
    { href: "/bracket", label: t("bracket") },
    { href: "/leaderboard", label: t("leaderboard") },
    { href: "/standings", label: t("standings") },
    { href: "/groups", label: t("groups") },
    { href: "/teams", label: t("teams") },
    { href: "/premium", label: t("premium") },
  ];

  return (
    <header className="border-b border-[var(--color-border)] bg-[#0a0a0a]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Trophy className="w-5 h-5 text-[#f0a500]" />
            <span>WC26</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/" || pathname === "/es"
                  : pathname.startsWith(link.href) ||
                    pathname.startsWith(`/es${link.href}`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? "text-white bg-white/10"
                      : "text-[#888] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/account"
              aria-label={t("account")}
              className={`px-2 py-2 rounded-md transition-colors ${
                pathname.startsWith("/account") || pathname.startsWith("/es/account")
                  ? "text-white bg-white/10"
                  : "text-[#888] hover:text-white hover:bg-white/5"
              }`}
            >
              <UserCircle className="w-5 h-5" />
            </Link>
            <div className="ml-2 pl-2 border-l border-[#333]">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
