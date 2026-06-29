import { teams, matches, groups } from "@/lib/data";

const baseUrl = "https://wc26live.org";

export default async function sitemap() {
  const staticPages = [
    "/",
    "/schedule",
    "/bracket",
    "/standings",
    "/teams",
    "/groups",
    "/watch",
    "/predict",
    "/leaderboard",
    "/subscribe",
    "/about",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "/" ? 1.0 : 0.8,
  }));

  const teamPages = teams.map((t) => ({
    url: `${baseUrl}/teams/${t.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  const groupPages = groups.map((g) => ({
    url: `${baseUrl}/groups/${g.replace("Group ", "").toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  const matchPages = matches
    .filter((m) => m.homeTeam !== "tbd" && m.awayTeam !== "tbd")
    .map((m) => ({
      url: `${baseUrl}/match/${m.id}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    }));

  return [...staticPages, ...teamPages, ...groupPages, ...matchPages];
}
