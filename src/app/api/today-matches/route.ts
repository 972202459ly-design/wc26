import { NextResponse } from "next/server";
import {
  matches as staticMatches,
  teams,
  getTeamFlagUrl,
  getTeamIdByName,
  stageLabel,
} from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const LIVE_STATUS = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

// How many match tabs the prediction module shows. Kept tight on purpose.
const MAX_MATCHES = 4;
// A just-finished match lingers this long (≈2h play + 2h after) so visitors can
// see the AI's pre-match call against the actual result.
const RECENT_FINISHED_MS = 4 * 60 * 60 * 1000;

function teamGroup(teamName: string): string {
  return teams.find((t) => t.name === teamName)?.group ?? "";
}

export async function GET() {
  const now = Date.now();

  // Pull live scores from DB up front — we need each match's status to decide
  // what's live vs upcoming.
  let dbMap = new Map<string, { home_score: number; away_score: number; status: string }>();
  let dbRows: any[] = [];
  try {
    const sql = neon(process.env.DATABASE_URL!);
    dbRows = (await sql`SELECT match_id, home_team, away_team, home_score, away_score, status, stage, utc_date FROM match_scores`) as any[];
    dbMap = new Map(dbRows.map((r) => [r.match_id, r]));
  } catch {
    // Non-fatal — fall back to timestamp-derived status
  }

  // Knockout fixtures aren't in the static schedule (teams unknown at build
  // time), so fold in real DB-only fixtures as synthetic static entries so the
  // module shows live/upcoming knockout matches too.
  const staticIds = new Set(staticMatches.map((m) => m.id));
  const koMatches = dbRows
    .filter((r) => !staticIds.has(r.match_id) && r.home_team !== "tbd" && r.away_team !== "tbd")
    .map((r) => {
      const ko = new Date(r.utc_date);
      return {
        id: r.match_id,
        homeTeam: r.home_team,
        awayTeam: r.away_team,
        homeScore: null,
        awayScore: null,
        status: "upcoming" as const,
        minute: null,
        date: ko.toISOString().slice(0, 10),
        time: ko.toISOString().slice(11, 19) + "Z",
        venue: "",
        stage: r.stage ?? "GROUP_STAGE",
      };
    });
  const allFixtures = [...staticMatches, ...koMatches];

  // Annotate every fixture with its kickoff time + freshly-derived status, so
  // the window is "now"-centric rather than tied to the UTC calendar day (WC
  // match days routinely straddle UTC midnight, which made the old "today"
  // filter show a different, arbitrary-looking set depending on the hour).
  const annotated = allFixtures.map((m) => {
    const ko = new Date(`${m.date}T${m.time}`).getTime();
    const db = dbMap.get(m.id);
    let status: "upcoming" | "live" | "finished";
    if (db) {
      if (LIVE_STATUS.has(db.status)) status = "live";
      else if (db.status === "FINISHED") status = "finished";
      else status = ko > now ? "upcoming" : "live";
    } else {
      status = ko > now ? "upcoming" : ko > now - 115 * 60 * 1000 ? "live" : "finished";
    }
    return { m, ko, db, status };
  });

  // This is the AI *prediction* module, so it looks forward: whatever is live
  // right now, then the next kickoffs. Finished results still appear in the
  // homepage "Today's matches" grid below, so nothing is lost here.
  const live = annotated.filter((x) => x.status === "live").sort((a, b) => a.ko - b.ko);
  const upcoming = annotated.filter((x) => x.status === "upcoming").sort((a, b) => a.ko - b.ko);
  const recentFinished = annotated
    .filter((x) => x.status === "finished" && x.ko > now - RECENT_FINISHED_MS)
    .sort((a, b) => a.ko - b.ko);

  // Forward-looking core first; only fill leftover slots with the most recent
  // just-ended matches, prepended so the tabs read chronologically.
  const core = [...live, ...upcoming];
  const slots = Math.max(0, MAX_MATCHES - core.length);
  const tail = slots > 0 ? recentFinished.slice(-slots) : [];
  let chosen = [...tail, ...core].slice(0, MAX_MATCHES);

  // Tournament over (nothing live, upcoming, or recently finished) → fall back
  // to the most recent finished matches so the module is never empty.
  if (chosen.length === 0) {
    chosen = annotated
      .filter((x) => x.status === "finished")
      .sort((a, b) => b.ko - a.ko)
      .slice(0, MAX_MATCHES)
      .reverse();
  }

  const result = chosen
    .map(({ m, db, status }) => {
      const homeId = getTeamIdByName(m.homeTeam) ?? m.id.split("-")[0];
      const awayId = getTeamIdByName(m.awayTeam) ?? m.id.split("-")[1];
      const pred = predictMatch(m.homeTeam, m.awayTeam);

      return {
        id: m.id,
        home: m.homeTeam,
        away: m.awayTeam,
        homeFlag: getTeamFlagUrl(homeId),
        awayFlag: getTeamFlagUrl(awayId),
        utc_date: `${m.date}T${m.time}`,
        stage: stageLabel(m.stage),
        group: teamGroup(m.homeTeam),
        status,
        homeScore: db ? db.home_score : null,
        awayScore: db ? db.away_score : null,
        prediction: {
          homePct: pred.homePct,
          drawPct: pred.drawPct,
          awayPct: pred.awayPct,
          scoreHome: pred.topHome,
          scoreAway: pred.topAway,
        },
      };
    });

  return NextResponse.json(result, {
    headers: {
      // Edge CDN caches this for 15s — all concurrent pollers share one DB hit
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
    },
  });
}
