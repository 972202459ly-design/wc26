import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: "WC26 Live — 2026 FIFA World Cup Live Scores & Schedule",
    template: "%s | WC26 Live",
  },
  description:
    "Live scores, match schedules, standings, and real-time updates for the 2026 FIFA World Cup. Hosted across USA, Canada, and Mexico.",
  keywords: [
    "2026 World Cup",
    "FIFA World Cup",
    "live scores",
    "World Cup schedule",
    "World Cup standings",
  ],
  openGraph: {
    title: "WC26 Live — 2026 FIFA World Cup Tracker",
    description:
      "Live scores, schedules, and standings for the 2026 FIFA World Cup.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "WC26 Live — 2026 FIFA World Cup",
    description:
      "Live scores, schedules, and standings for the 2026 FIFA World Cup.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Google AdSense — plain <script> for crawler detection */}
        {adsenseClient && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#e5e5e5]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />

        {/* Google Analytics */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
