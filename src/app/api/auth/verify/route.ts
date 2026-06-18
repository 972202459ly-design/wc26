import { NextRequest, NextResponse } from "next/server";
import {
  verifyMagicToken,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

const SITE = "https://wc26live.org";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || undefined;
  const email = verifyMagicToken(token);

  if (!email) {
    // Expired or tampered link → bounce to account page with an error flag.
    return NextResponse.redirect(`${SITE}/account?error=link`);
  }

  const session = createSessionToken(email);
  if (!session) {
    return NextResponse.redirect(`${SITE}/account?error=config`);
  }

  const res = NextResponse.redirect(`${SITE}/account?signed_in=1`);
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  return res;
}
