import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): string | null {
  if (!acceptLanguage) return null;
  const locales = ["es", "en"];
  const preferred = acceptLanguage
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split(";q=");
      const lang = parts[0]!.split("-")[0]!.toLowerCase();
      const q = parts[1] ? parseFloat(parts[1]) : 1;
      return { lang, q };
    })
    .sort((a, b) => b.q - a.q);
  for (const p of preferred) {
    if (locales.includes(p.lang)) return p.lang;
  }
  return null;
}

export async function getServerLocale(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get("NEXT_LOCALE")?.value;
    if (cookie && ["en", "es"].includes(cookie)) return cookie;

    const headersList = await headers();
    const detected = detectLocaleFromAcceptLanguage(headersList.get("accept-language"));
    return detected ?? "en";
  } catch {
    return "en";
  }
}

export default getRequestConfig(async ({ locale }) => ({
  locale: locale ?? "en",
  messages: (await import(`../../messages/${locale ?? "en"}.json`)).default,
}));
