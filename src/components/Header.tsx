"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, UserCircle, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/schedule", label: t("schedule") },
    { href: "/bracket", label: t("bracket") },
    { href: "/leaderboard", label: t("leaderboard") },
    { href: "/standings", label: t("standings") },
    { href: "/groups", label: t("groups") },
    { href: "/teams", label: t("teams") },
    { href: "/premium", label: t("premium") },
    { href: "/account", label: t("account") },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname === "/es"
      : pathname.startsWith(href) || pathname.startsWith(`/es${href}`);

  // Close the menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the full-screen menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-[var(--color-border)] bg-[#0a0a0a]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Trophy className="w-5 h-5 text-[#f0a500]" />
            <span>WC26</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.slice(0, 8).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive(link.href)
                    ? "text-white bg-white/10"
                    : "text-[#888] hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="ml-1 shrink-0 rounded-lg bg-[#f0a500] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#d49500] transition-colors"
            >
              Free Alerts
            </Link>
            <Link
              href="/account"
              aria-label={t("account")}
              className={`px-2 py-2 rounded-md transition-colors ${
                isActive("/account")
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

          {/* Mobile controls: language + hamburger only */}
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-md text-[#ccc] hover:bg-white/5 hover:text-white"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen mobile menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto bg-[#0a0a0a] md:hidden">
          <nav className="flex flex-col px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`flex min-h-[44px] items-center rounded-lg px-4 text-base transition-colors ${
                  isActive(link.href)
                    ? "bg-[#f0a500]/15 font-semibold text-[#f0a500]"
                    : "text-[#ccc] hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="mt-4 flex min-h-[44px] items-center justify-center rounded-lg bg-[#f0a500] px-4 text-base font-bold text-black hover:bg-[#d49500]"
            >
              Free Alerts
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
