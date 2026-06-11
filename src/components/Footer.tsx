import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/teams", label: "Teams" },
  { href: "/subscribe", label: "Get Alerts" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="font-bold text-lg mb-3">WC26 Live</h3>
            <p className="text-sm text-[#888] leading-relaxed">
              Your free, real-time tracker for the 2026 FIFA World Cup. Live
              scores, schedules, standings, and match alerts.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">
              Links
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#888] hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-3">
              Disclaimer
            </h4>
            <p className="text-xs text-[#888] leading-relaxed">
              WC26 Live is an independent fan project and is not affiliated with
              FIFA or any official football governing body. All data is for
              informational purposes only.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[#888]">
          &copy; {new Date().getFullYear()} WC26 Live. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
