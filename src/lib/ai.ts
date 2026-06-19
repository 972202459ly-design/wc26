import type { Prediction } from "./predict";

// ─── DeepSeek narrative layer ─────────────────────────────────────────
// The numbers come from our own model (predict.ts); DeepSeek only turns them
// into a readable analysis. deepseek-v4-pro is a reasoning model: it returns
// reasoning_content (discarded) plus the final content, so max_tokens must be
// generous or content comes back empty.

const BASE = "https://api.deepseek.com";
const MODEL = "deepseek-v4-pro";

const SYSTEM =
  "You are the prediction analyst for a World Cup 2026 site's paid feature. " +
  "Given a fixture and our statistical model's output, write a punchy 2-3 sentence " +
  "analysis in English that explains the probabilities, names the single most relevant " +
  "factor, and ends with a clear pick. Be confident and readable. Only reason from the " +
  "numbers given and widely-known team strength — do NOT invent specific stats, injuries, " +
  "lineups, venues, or home advantage (the tournament is at neutral venues). " +
  "Write in plain ASCII only: use straight quotes ('), regular hyphens (-), and no " +
  "smart/curly punctuation, emoji, or non-English characters.";

// LLM output occasionally contains smart punctuation or stray non-ASCII bytes
// that render as mojibake. Normalise to ASCII; the analysis is English-only.
function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function generateAnalysis(
  home: string,
  away: string,
  stage: string,
  p: Prediction
): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error("DEEPSEEK_API_KEY not set — cannot generate analysis");
    return null;
  }

  const user =
    `Fixture: ${home} vs ${away} (${stage})\n` +
    `Model win probabilities: ${home} ${p.homePct}%, Draw ${p.drawPct}%, ${away} ${p.awayPct}%\n` +
    `Model expected goals: ${home} ${p.lambdaHome} - ${p.lambdaAway} ${away}\n` +
    `Most likely scoreline: ${p.topHome}-${p.topAway}\n` +
    `Write the prediction analysis.`;

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 1200, // reasoning model — leave room for thinking + answer
      }),
      // Don't let a slow LLM hang the request.
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.error(`DeepSeek HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content?.trim();
    return text ? sanitize(text) : null;
  } catch (e) {
    console.error("DeepSeek analysis failed:", e);
    return null;
  }
}
