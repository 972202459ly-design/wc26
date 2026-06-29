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

  const navLinks: { href: string; label: string; badge?: string }[] = [
    { href: "/", label: t("home") },
    { href: "/schedule", label: t("schedule") },
    { href: "/watch", label: "Watch", badge: "NEW" },
    { href: "/bracket", label: t("bracket") },
    { href: "/standings", label: t("standings") },
    { href: "/teams", label: t("teams") },
    { href: "/groups", label: t("groups") },
    { href: "/leaderboard", label: t("leaderboard") },
    { href: "/leagues", label: "Leagues" },
    { href: "/premium", label: t("premium") },
    { href: "/account", label: t("account") },
  ];
  const mobileNavLinks = navLinks.filter((link) =>
    ["/schedule", "/watch", "/bracket", "/teams"].includes(link.href)
  );

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
            {navLinks.slice(0, 9).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive(link.href)
                    ? "text-white bg-white/10"
                    : "text-[#888] hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="ml-1 rounded bg-[#f0a500] px-1 py-0.5 text-[8px] font-bold align-top text-black">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <Link
              href="/account?mode=register"
              className="ml-1 shrink-0 rounded-lg bg-[#f0a500] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#d49500] transition-colors"
            >
              Join Free
            </Link>
            <Link
              href="/premium"
              className="shrink-0 rounded-lg border border-[#f0a500]/60 px-3 py-1.5 text-xs font-bold text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors"
            >
              Go Pro
            </Link>
            <Link
              href="/subscribe"
              className="shrink-0 rounded-lg border border-[#444] px-3 py-1.5 text-xs font-bold text-[#ccc] hover:border-[#f0a500] hover:text-white transition-colors"
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

          {/* Mobile controls */}
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSwitcher />
            <Link
              href="/account?mode=register"
              className="rounded-md bg-[#f0a500] px-3 py-2 text-xs font-bold text-black hover:bg-[#d49500]"
            >
              Join
            </Link>
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
            {mobileNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-base transition-colors ${
                  isActive(link.href)
                    ? "bg-[#f0a500]/15 font-semibold text-[#f0a500]"
                    : "text-[#ccc] hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="rounded bg-[#f0a500] px-1.5 py-0.5 text-[9px] font-bold text-black">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <Link
              href="/account?mode=register"
              className="mt-4 flex min-h-[44px] items-center justify-center rounded-lg bg-[#f0a500] px-4 text-base font-bold text-black hover:bg-[#d49500]"
            >
              Join Free
            </Link>
            <Link
              href="/premium"
              className="mt-2 flex min-h-[44px] items-center justify-center rounded-lg border border-[#f0a500]/60 px-4 text-base font-bold text-[#f0a500] hover:bg-[#f0a500] hover:text-black"
            >
              Go Pro — $7.99
            </Link>
            <Link
              href="/subscribe"
              className="mt-2 flex min-h-[44px] items-center justify-center rounded-lg border border-[#444] px-4 text-base font-bold text-[#ccc] hover:border-[#f0a500] hover:text-white"
            >
              Free Alerts
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
