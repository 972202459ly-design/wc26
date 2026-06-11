import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["en", "es"];
const DEFAULT_LOCALE = "en";

function getLocaleParts(
  pathname: string
): { locale: string | null; pathnameWithoutLocale: string } {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && LOCALES.includes(segments[0])) {
    return {
      locale: segments[0],
      pathnameWithoutLocale: "/" + segments.slice(1).join("/"),
    };
  }
  return { locale: null, pathnameWithoutLocale: pathname };
}

function detectLocaleFromAcceptLanguage(
  acceptLanguage: string | null
): string | null {
  if (!acceptLanguage) return null;
  for (const part of acceptLanguage.split(",")) {
    const code = part.split(";")[0].trim().substring(0, 2);
    if (LOCALES.includes(code)) return code;
  }
  return null;
}

function resolveLocale(
  pathname: string,
  acceptLanguage: string | null,
  cookieLocale: string | undefined
): string {
  // Prio 1: locale from URL path (/es/...)
  const { locale } = getLocaleParts(pathname);
  if (locale) return locale;

  // Prio 2: locale from cookie
  if (cookieLocale && LOCALES.includes(cookieLocale)) return cookieLocale;

  // Prio 3: locale from Accept-Language header
  const acceptLocale = detectLocaleFromAcceptLanguage(acceptLanguage);
  if (acceptLocale) return acceptLocale;

  // Prio 4: default
  return DEFAULT_LOCALE;
}

function setLocaleHeader(headers: Headers, locale: string): Headers {
  const newHeaders = new Headers(headers);
  newHeaders.set("X-NEXT-INTL-LOCALE", locale);
  return newHeaders;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-page routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_vercel/") ||
    /[.]/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const { locale: pathLocale, pathnameWithoutLocale } = getLocaleParts(pathname);

  // /en/... → redirect to /... (strip default locale prefix)
  if (pathLocale === DEFAULT_LOCALE && pathname !== pathnameWithoutLocale) {
    const url = new URL(pathnameWithoutLocale || "/", request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // /es/... → rewrite without prefix, set locale header + cookie
  if (pathLocale && pathLocale !== DEFAULT_LOCALE) {
    const url = new URL(pathnameWithoutLocale || "/", request.url);
    url.search = request.nextUrl.search;
    const headers = setLocaleHeader(request.headers, pathLocale);
    const response = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.set("NEXT_LOCALE", pathLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // No locale in path — detect from cookie or Accept-Language
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = resolveLocale(
    pathname,
    request.headers.get("accept-language"),
    cookieLocale
  );

  // If resolved to Spanish, redirect to /es/...
  if (locale !== DEFAULT_LOCALE) {
    const target = pathname === "/" ? "/es" : `/es${pathname}`;
    const url = new URL(target, request.url);
    url.search = request.nextUrl.search;
    const response = NextResponse.redirect(url);
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // Default locale — pass through with header
  const headers = setLocaleHeader(request.headers, DEFAULT_LOCALE);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
