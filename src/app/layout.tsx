import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AmazonStickyBar from "@/components/AmazonStickyBar";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getServerLocale } from "@/i18n/request";
import { eventPerformers } from "@/lib/data";

export const metadata: Metadata = {
  metadataBase: new URL("https://wc26live.org"),
  title: {
    default: "WC26 Live — 2026 FIFA World Cup Live Scores & Schedule",
    template: "%s | WC26 Live",
  },
  description:
    "Live scores, match schedules, standings, teams and predictions for the 2026 FIFA World Cup, hosted across the USA, Canada, and Mexico.",
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
  verification: {
    google: "iBJ1oaflHqtF2vaUw8xfMlhC159GrdA4-ydINgBSivQ",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
  } catch {
    messages = (await import(`../../messages/en.json`)).default as Record<string, unknown>;
  }

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        {adsenseClient && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        )}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "WC26 Live",
                url: "https://wc26live.org",
                description:
                  "Live scores, schedule, standings and knockout bracket for the 2026 FIFA World Cup.",
              },
              {
                "@context": "https://schema.org",
                "@type": "SportsEvent",
                name: "2026 FIFA World Cup",
                description:
                  "The 2026 FIFA World Cup — 48 teams across the United States, Canada and Mexico. Live scores, schedule, standings and knockout bracket.",
                sport: "Football",
                startDate: "2026-06-11T00:00:00",
                endDate: "2026-07-19T23:59:59",
                eventStatus: "https://schema.org/EventScheduled",
                eventAttendanceMode:
                  "https://schema.org/OfflineEventAttendanceMode",
                url: "https://wc26live.org",
                image: ["https://wc26live.org/opengraph-image"],
                organizer: {
                  "@type": "Organization",
                  name: "FIFA",
                  url: "https://www.fifa.com",
                },
                location: {
                  "@type": "Place",
                  name: "United States, Canada & Mexico",
                  address: {
                    "@type": "PostalAddress",
                    addressCountry: "US",
                  },
                },
                offers: {
                  "@type": "Offer",
                  url: "https://wc26live.org",
                  price: "0",
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                  validFrom: "2026-06-11T00:00:00",
                },
                performer: eventPerformers,
              },
            ]),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#e5e5e5]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <main className="flex-1 pb-14">{children}</main>
          <AmazonStickyBar />
          <Footer />
        </NextIntlClientProvider>

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
