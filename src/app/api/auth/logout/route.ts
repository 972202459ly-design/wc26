import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const SITE = "https://wc26live.org";

export async function POST() {
  const res = NextResponse.redirect(`${SITE}/account`, { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
