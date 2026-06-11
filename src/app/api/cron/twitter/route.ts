import { NextResponse } from "next/server";
import { ensureTable, ensureTweetTable, getAllScores, isMatchTweeted, markMatchTweeted } from "@/lib/db";
import { TwitterApi } from "twitter-api-v2";

const CRON_SECRET = process.env.CRON_SECRET;

function getTwitterClient(): TwitterApi {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });
}

function formatTweet(match: {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  stage: string | null;
}): string | null {
  if (match.home_score === null || match.away_score === null) return null;

  const stage = match.stage?.replace(/_/g, " ") || "Match";
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "IN_PLAY";
  const isPaused = match.status === "PAUSED";

  if (isFinished) {
    return `🟢 FT | ${stage}\n\n${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}\n\n#WorldCup2026 #FIFAWorldCup`;
  }

  if (isLive || isPaused) {
    return `🔴 LIVE | ${stage}\n\n${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}\n\n#WorldCup2026 #FIFAWorldCup`;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (CRON_SECRET && key !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTable();
    await ensureTweetTable();

    const allMatches = await getAllScores();
    if (allMatches.length === 0) {
      return NextResponse.json({ success: true, tweeted: 0, reason: "No matches in DB" });
    }

    // Check if Twitter credentials are configured
    if (!process.env.TWITTER_API_KEY) {
      return NextResponse.json({ success: false, tweeted: 0, reason: "Twitter API not configured" });
    }

    const client = getTwitterClient();
    let tweeted = 0;
    const results: { match: string; tweetId: string }[] = [];

    for (const m of allMatches) {
      if (m.status !== "FINISHED" && m.status !== "IN_PLAY" && m.status !== "PAUSED") continue;
      if (m.home_score === null || m.away_score === null) continue;

      const alreadyTweeted = await isMatchTweeted(m.api_id);
      if (alreadyTweeted) continue;

      const text = formatTweet(m);
      if (!text) continue;

      try {
        const tweet = await client.v2.tweet(text);
        await markMatchTweeted(m.api_id, tweet.data.id);
        tweeted++;
        results.push({ match: `${m.home_team} vs ${m.away_team}`, tweetId: tweet.data.id });
      } catch (tweetErr: any) {
        console.error(`Failed to tweet match ${m.match_id}:`, tweetErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      tweeted,
      results,
    });
  } catch (err: any) {
    console.error("Twitter cron error:", err);
    return NextResponse.json(
      { error: err.message || "Twitter cron failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
