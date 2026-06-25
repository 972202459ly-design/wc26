// Config-driven direct sponsors. A slot is "sold" by setting its env var to a
// JSON string; until then the slot shows a house ad pointing at /advertise, so
// unsold inventory still works for us. Values are read at build time (they're
// NEXT_PUBLIC), so changing a sponsor means a redeploy — fine at this cadence.
//
//   NEXT_PUBLIC_SPONSOR_MATCHDAY='{"name":"Joe’s Sports Bar","headline":"Watch every match live in Austin","cta":"Visit","url":"https://..."}'

export type SponsorPlacement = "matchday" | "leaderboard" | "email";

export interface Sponsor {
  name: string;
  headline: string;
  cta: string;
  url: string;
}

function parse(raw: string | undefined): Sponsor | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s && typeof s.name === "string" && typeof s.url === "string") {
      return {
        name: s.name,
        headline: typeof s.headline === "string" ? s.headline : s.name,
        cta: typeof s.cta === "string" ? s.cta : "Visit",
        url: s.url,
      };
    }
  } catch {
    /* malformed config → treat as unsold */
  }
  return null;
}

// Must be static literal env reads for Next.js inlining — no dynamic keys.
export const SPONSORS: Record<SponsorPlacement, Sponsor | null> = {
  matchday: parse(process.env.NEXT_PUBLIC_SPONSOR_MATCHDAY),
  leaderboard: parse(process.env.NEXT_PUBLIC_SPONSOR_LEADERBOARD),
  email: parse(process.env.NEXT_PUBLIC_SPONSOR_EMAIL),
};

export function getSponsor(placement: SponsorPlacement): Sponsor | null {
  return SPONSORS[placement];
}

export const ADVERTISE_EMAIL =
  process.env.NEXT_PUBLIC_ADVERTISE_EMAIL || "972202459ly@gmail.com";
