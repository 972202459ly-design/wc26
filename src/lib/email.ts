import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface UpcomingMatch {
  home_team: string;
  away_team: string;
  utc_date: string;
  stage: string | null;
  group_name: string | null;
  match_id: string;
  api_id: number;
  // AI win probabilities (%), attached by the cron for the Match Reminder.
  homePct?: number;
  drawPct?: number;
  awayPct?: number;
}

export interface ScoreChange {
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: string;
  stage: string | null;
  // Enriched fields
  prev_home_score?: number | null;
  prev_away_score?: number | null;
  half_time_home?: number | null;
  half_time_away?: number | null;
  utc_date?: string | null;
  match_id?: string;
  // Goal scorer (from API-Football events)
  scorer?: string | null;
  goal_minute?: number | null;
  assist?: string | null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stageLabel(stage: string | null): string {
  return stage?.replace(/_/g, " ") || "";
}

function formatDate(utcDate?: string | null): string {
  if (!utcDate) return "";
  const d = new Date(utcDate);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const mins = d.getUTCMinutes().toString().padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hours}:${mins} UTC`;
}

// ── Shared card layout ──

function goalNarrative(c: ScoreChange): string {
  if (c.prev_home_score == null || c.prev_away_score == null) return "";
  const prevDiff = c.prev_home_score - c.prev_away_score;
  const newDiff = c.home_score - c.away_score;
  const homeDelta = c.home_score - c.prev_home_score;
  const awayDelta = c.away_score - c.prev_away_score;

  if (homeDelta > 0) {
    if (prevDiff < 0 && newDiff === 0) return `${esc(c.home_team)} equalizes!`;
    if (prevDiff < 0 && newDiff > 0) return `${esc(c.home_team)} takes the lead!`;
    if (prevDiff === 0 && newDiff > 0) return `${esc(c.home_team)} takes the lead!`;
    if (newDiff >= 2 && prevDiff >= 1) return `${esc(c.home_team)} extends the lead!`;
    if (prevDiff < 0 && newDiff < 0) return `${esc(c.home_team)} pulls one back!`;
    if (homeDelta >= 2) return `${esc(c.home_team)} scores ${homeDelta} quick goals!`;
    return `${esc(c.home_team)} scores!`;
  }
  if (awayDelta > 0) {
    if (prevDiff > 0 && newDiff === 0) return `${esc(c.away_team)} equalizes!`;
    if (prevDiff > 0 && newDiff < 0) return `${esc(c.away_team)} takes the lead!`;
    if (prevDiff === 0 && newDiff < 0) return `${esc(c.away_team)} takes the lead!`;
    if (newDiff <= -2 && prevDiff <= -1) return `${esc(c.away_team)} extends the lead!`;
    if (prevDiff > 0 && newDiff > 0) return `${esc(c.away_team)} pulls one back!`;
    if (awayDelta >= 2) return `${esc(c.away_team)} scores ${awayDelta} quick goals!`;
    return `${esc(c.away_team)} scores!`;
  }
  return "";
}

function matchSummary(c: ScoreChange): string {
  const diff = Math.abs(c.home_score - c.away_score);
  const winner = c.home_score > c.away_score ? esc(c.home_team) : c.away_score > c.home_score ? esc(c.away_team) : null;
  const htHome = c.half_time_home;
  const htAway = c.half_time_away;

  const lines: string[] = [];

  // Score line
  if (!winner) {
    lines.push(`A hard-fought draw at ${c.home_score}-${c.away_score}`);
    if (c.home_score + c.away_score >= 6) lines[0] = `A thrilling ${c.home_score}-${c.away_score} goal-fest ends all square`;
  } else if (diff === 1) {
    lines.push(`${winner} edges out a narrow victory`);
  } else if (diff <= 3) {
    lines.push(`${winner} claims a convincing win`);
  } else {
    lines.push(`${winner} delivers a dominant performance`);
  }

  // Shutout
  if (diff > 0 && (c.home_score === 0 || c.away_score === 0)) {
    lines.push("Clean sheet secured");
  }

  // Comeback
  if (htHome != null && htAway != null) {
    const htLeading = htHome > htAway ? c.home_team : htAway > htHome ? c.away_team : null;
    const ftLeading = c.home_score > c.away_score ? c.home_team : c.away_score > c.home_score ? c.away_team : null;
    if (htLeading && ftLeading && htLeading !== ftLeading) {
      lines.push(`${esc(ftLeading)} came from behind to win`);
    } else if (htHome === htAway && ftLeading) {
      lines.push(`Deadlocked at half-time, ${esc(ftLeading)} broke through in the second half`);
    }
  }

  return lines.join(". ") + ".";
}

// ── Shared card layout ──

function matchCardHtml(c: ScoreChange, accentColor: string, accentLabel: string, narrative?: string): string {
  const prevScore = (c.prev_home_score != null && c.prev_away_score != null)
    ? `<div style="color:#666;font-size:13px;margin-top:2px">was ${c.prev_home_score} - ${c.prev_away_score}</div>`
    : "";

  const htLine = (c.half_time_home != null && c.half_time_away != null)
    ? `<div style="color:#888;font-size:13px;margin-top:6px">HT: ${c.half_time_home} - ${c.half_time_away}</div>`
    : "";

  const narrativeLine = narrative
    ? `<div style="color:#fff;font-size:15px;font-weight:600;margin-top:10px;padding:8px 12px;background:${accentColor}18;border-left:3px solid ${accentColor};border-radius:4px">${narrative}</div>`
    : "";

  const dateLine = formatDate(c.utc_date);
  const stageLine = stageLabel(c.stage);
  const metaParts = [stageLine, dateLine].filter(Boolean);
  const meta = metaParts.length > 0
    ? `<div style="color:#666;font-size:12px;margin-top:8px">${metaParts.join(" · ")}</div>`
    : "";

  const matchUrl = c.match_id ? `https://wc26live.org/match/${c.match_id}` : "https://wc26live.org";

  return `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:16px">
      <div style="display:inline-block;background:${accentColor};padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;margin-bottom:12px;color:#000">${accentLabel}</div>
      <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px">
        ${esc(c.home_team)} <span style="color:#f0a500">${c.home_score}</span> - <span style="color:#f0a500">${c.away_score}</span> ${esc(c.away_team)}
      </div>
      ${prevScore}
      ${htLine}
      ${narrativeLine}
      ${meta}
      <a href="${matchUrl}" style="display:inline-block;margin-top:14px;padding:8px 20px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">View Match →</a>
    </div>`;
}

// Compact upgrade promo appended to alert emails — converts engaged readers
// at peak excitement (a goal just happened) without a heavy sell.
function promoBlock(): string {
  return `
    <div style="background:#1a1a2e;border:1px solid #f0a500;border-radius:8px;padding:14px 16px;margin-bottom:16px;text-align:center">
      <div style="color:#fff;font-size:14px;font-weight:600;margin-bottom:6px">⚡ Want goal alerts the second they happen?</div>
      <div style="color:#aaa;font-size:12px;margin-bottom:10px">Tournament Pass: instant alerts (with scorer), kickoff reminders, follow your team, ad-free — all the way to the final.</div>
      <a href="https://wc26live.org/premium" style="display:inline-block;padding:8px 20px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700">Get the Tournament Pass — $4.99 →</a>
    </div>`;
}

// ── Shared email wrapper ──

function wrapHtml(title: string, subtitle: string, body: string, email?: string): string {
  const unsubscribeUrl = email
    ? `https://wc26live.org/api/unsubscribe?email=${encodeURIComponent(email)}`
    : "https://wc26live.org/subscribe";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;padding:24px">
  <div style="max-width:600px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="color:#fff;font-size:22px;margin:0 0 4px">WC26 Live</h1>
      <p style="color:#888;font-size:14px;margin:0">${subtitle}</p>
    </div>
    ${body}
    <hr style="border:none;border-top:1px solid #333;margin:24px 0">
    <p style="color:#555;font-size:12px;text-align:center">
      <a href="https://wc26live.org" style="color:#666">wc26live.org</a> —
      <a href="${unsubscribeUrl}" style="color:#666">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}

async function sendBatch(
  subscribers: { email: string }[],
  subject: string,
  htmlBuilder: (email: string) => string,
  text: string
): Promise<{ sent: number; failed: number }> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping email notifications");
    return { sent: 0, failed: 0 };
  }

  if (subscribers.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  // Build one payload per recipient. We send via Resend's *batch* endpoint
  // (one HTTP request per chunk) instead of firing N concurrent single-sends:
  // the per-request rate limit (~2 req/s) silently 429'd most recipients once
  // the list grew past a handful, so all but the first few were dropped.
  const payloads = subscribers.map((sub) => {
    const unsubscribeUrl = `https://wc26live.org/api/unsubscribe?email=${encodeURIComponent(sub.email)}`;
    return {
      from: "WC26 Live <noreply@wc26live.org>",
      to: sub.email,
      subject,
      html: htmlBuilder(sub.email),
      text,
      // RFC 8058 one-click unsubscribe — required by Gmail/Yahoo bulk-sender
      // rules and a strong inbox-placement (anti-spam) signal.
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  });

  // Resend batch endpoint accepts up to 100 messages per call.
  const CHUNK = 100;
  for (let i = 0; i < payloads.length; i += CHUNK) {
    const chunk = payloads.slice(i, i + CHUNK);
    try {
      const { data, error } = await resend!.batch.send(chunk);
      if (error) {
        failed += chunk.length;
        console.error("Resend batch send failed:", error);
      } else {
        sent += data?.data?.length ?? chunk.length;
      }
    } catch (err: any) {
      failed += chunk.length;
      console.error("Resend batch send threw:", err?.message);
    }
    // Stay under the request rate limit when there are multiple chunks.
    if (i + CHUNK < payloads.length) await new Promise((r) => setTimeout(r, 600));
  }

  return { sent, failed };
}

// ── Welcome email (on signup) ──

export async function sendWelcomeEmail(email: string): Promise<void> {
  if (!resend) return;
  const body = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:24px">
      <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:12px">You're all set! ⚽</div>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px">
        You'll now get 2026 World Cup match alerts straight to your inbox —
        kickoffs, goals and final results.
      </p>
      <div style="background:#0f0f0f;border-left:3px solid #f0a500;border-radius:4px;padding:12px 14px;margin-bottom:16px">
        <div style="color:#f0a500;font-size:13px;font-weight:700;margin-bottom:4px">📥 So you never miss a goal</div>
        <p style="color:#aaa;font-size:13px;line-height:1.5;margin:0">
          Add <b style="color:#fff">noreply@wc26live.org</b> to your contacts.
          On Gmail, drag this email to your <b style="color:#fff">Primary</b> tab
          so future alerts land there.
        </p>
      </div>
      <a href="https://wc26live.org" style="display:inline-block;padding:10px 22px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Open WC26 Live →</a>
      <div style="margin-top:20px;border-top:1px solid #2a2a2a;padding-top:16px">
        <div style="color:#f0a500;font-size:13px;font-weight:700;margin-bottom:6px">🎯 Also: play the free World Cup Pick'em</div>
        <p style="color:#aaa;font-size:13px;line-height:1.5;margin:0 0 12px">
          Predict match outcomes with <b style="color:#fff">1,000 free virtual points</b> and AI win probabilities.
          Climb the leaderboard — no purchase needed, just your email.
        </p>
        <a href="https://wc26live.org/predict" style="display:inline-block;padding:9px 18px;border:1px solid #f0a500;color:#f0a500;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">Start predicting →</a>
      </div>
    </div>`;
  const text = `You're subscribed to WC26 Live match alerts! To make sure you never miss a goal, add noreply@wc26live.org to your contacts (Gmail: drag this to your Primary tab). wc26live.org`;
  try {
    await resend.emails.send({
      from: "WC26 Live <noreply@wc26live.org>",
      to: email,
      subject: "You're in! ⚽ WC26 Live — 2026 World Cup alerts",
      html: wrapHtml("", "You're subscribed to World Cup 2026 alerts", body, email),
      text,
      headers: {
        "List-Unsubscribe": `<https://wc26live.org/api/unsubscribe?email=${encodeURIComponent(email)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (e) {
    console.error("Welcome email failed:", e);
  }
}

// ── Magic-link sign-in email ──

export async function sendMagicLink(email: string, url: string): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, cannot send magic link");
    return;
  }
  const body = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:24px;text-align:center">
      <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:12px">Sign in to WC26 Live</div>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 20px">
        Click the button below to access your account and any active Tournament Pass.
        This link expires in 15 minutes.
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 28px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:15px;font-weight:700">Sign in →</a>
      <p style="color:#666;font-size:12px;line-height:1.5;margin:20px 0 0">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>`;
  const text = `Sign in to WC26 Live: ${url} (expires in 15 minutes). If you didn't request this, ignore this email.`;
  try {
    await resend.emails.send({
      from: "WC26 Live <noreply@wc26live.org>",
      to: email,
      subject: "Your WC26 Live sign-in link",
      html: wrapHtml("", "Sign in to your account", body),
      text,
    });
  } catch (e) {
    console.error("Magic link email failed:", e);
  }
}

// ── Daily Picks digest (the daily pull-back engine) ──

export interface DailyPick {
  home_team: string;
  away_team: string;
  match_id: string;
  utc_date: string;
  stage: string | null;
  favorite: string; // team name, or "Draw"
  favoritePct: number;
}

export interface DigestRank {
  rank: number;
  points: number;
}

function dailyPicksHtml(
  picks: DailyPick[],
  top: { name: string; points: number }[],
  myRank: DigestRank | null,
  email: string
): string {
  const matchCards = picks
    .map((p) => {
      const url = `https://wc26live.org/match/${p.match_id}`;
      const meta = [stageLabel(p.stage), formatDate(p.utc_date)].filter(Boolean).join(" · ");
      return `
    <a href="${url}" style="display:block;text-decoration:none;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">${esc(p.home_team)} <span style="color:#666;font-weight:400">vs</span> ${esc(p.away_team)}</div>
      <div style="color:#f0a500;font-size:14px;font-weight:600">🧠 AI Prediction: ${esc(p.favorite)} ${p.favoritePct}%</div>
      <div style="color:#666;font-size:12px;margin-top:6px">${meta}</div>
    </a>`;
    })
    .join("");

  const cta = `
    <div style="text-align:center;margin:18px 0 8px">
      <a href="https://wc26live.org/predict" style="display:inline-block;padding:12px 28px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:15px;font-weight:700">Make Your Predictions →</a>
    </div>`;

  const medals = ["🥇", "🥈", "🥉"];
  const topRows = top
    .map(
      (t, i) =>
        `<div style="display:flex;justify-content:space-between;font-size:14px;color:#ddd;padding:4px 0"><span>${medals[i] || `#${i + 1}`} ${esc(t.name)}</span><span style="color:#f0a500;font-weight:700">${t.points.toLocaleString()} pts</span></div>`
    )
    .join("");

  const mine = myRank
    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:14px;color:#fff">You are <b style="color:#f0a500">#${myRank.rank}</b> — ${myRank.points.toLocaleString()} pts. <span style="color:#aaa">Can you reach the Top 10?</span></div>`
    : `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:14px;color:#aaa">You haven't predicted yet — <a href="https://wc26live.org/predict" style="color:#f0a500">make your first pick</a> to get on the board!</div>`;

  const leaderboard = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-top:8px">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px">🏆 Leaderboard</div>
      ${topRows}
      ${mine}
    </div>`;

  return wrapHtml("", `${picks.length} match${picks.length > 1 ? "es" : ""} to predict today`, matchCards + cta + leaderboard, email);
}

function dailyPicksText(picks: DailyPick[]): string {
  return (
    picks.map((p) => `${p.home_team} vs ${p.away_team} — AI: ${p.favorite} ${p.favoritePct}%`).join("\n") +
    `\n\nMake your predictions: https://wc26live.org/predict`
  );
}

export async function sendDailyPicksEmail(
  subscribers: { email: string }[],
  picks: DailyPick[],
  top: { name: string; points: number }[],
  rankByEmail: Map<string, DigestRank>
): Promise<{ sent: number; failed: number }> {
  if (picks.length === 0) return { sent: 0, failed: 0 };
  const subject = `⚽ Today's World Cup Picks — ${picks.length} match${picks.length > 1 ? "es" : ""}`;
  return sendBatch(
    subscribers,
    subject,
    (email) => dailyPicksHtml(picks, top, rankByEmail.get(email) ?? null, email),
    dailyPicksText(picks)
  );
}

// ── Daily Recap digest (end-of-day results, drives re-engagement) ──

export interface RecapResult {
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  match_id: string;
  stage: string | null;
}

function recapLine(r: RecapResult): string {
  const diff = Math.abs(r.home_score - r.away_score);
  if (r.home_score === r.away_score) {
    return r.home_score + r.away_score >= 5 ? "Goal-fest draw" : "Shared the spoils";
  }
  const winner = r.home_score > r.away_score ? r.home_team : r.away_team;
  if (diff >= 4) return `${esc(winner)} ran riot`;
  if (diff === 1) return `${esc(winner)} edged it`;
  return `${esc(winner)} won comfortably`;
}

function recapHtml(
  results: RecapResult[],
  top: { name: string; points: number }[],
  myRank: DigestRank | null,
  email: string
): string {
  const cards = results
    .map((r) => {
      const url = `https://wc26live.org/match/${r.match_id}`;
      const meta = stageLabel(r.stage);
      return `
    <a href="${url}" style="display:block;text-decoration:none;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:17px;font-weight:700;color:#fff">${esc(r.home_team)} <span style="color:#666;font-weight:400">vs</span> ${esc(r.away_team)}</div>
        <div style="font-size:20px;font-weight:800;color:#2ecc71">${r.home_score} - ${r.away_score}</div>
      </div>
      <div style="color:#aaa;font-size:13px;margin-top:6px">${recapLine(r)}${meta ? ` · ${meta}` : ""}</div>
    </a>`;
    })
    .join("");

  const cta = `
    <div style="text-align:center;margin:18px 0 8px">
      <a href="https://wc26live.org/predict" style="display:inline-block;padding:12px 28px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:15px;font-weight:700">Predict Tomorrow's Matches →</a>
    </div>`;

  const medals = ["🥇", "🥈", "🥉"];
  const topRows = top
    .map(
      (t, i) =>
        `<div style="display:flex;justify-content:space-between;font-size:14px;color:#ddd;padding:4px 0"><span>${medals[i] || `#${i + 1}`} ${esc(t.name)}</span><span style="color:#f0a500;font-weight:700">${t.points.toLocaleString()} pts</span></div>`
    )
    .join("");

  const mine = myRank
    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:14px;color:#fff">You are <b style="color:#f0a500">#${myRank.rank}</b> — ${myRank.points.toLocaleString()} pts.</div>`
    : `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:14px;color:#aaa">Not on the board yet — <a href="https://wc26live.org/predict" style="color:#f0a500">make a prediction</a> to climb the ranks!</div>`;

  const leaderboard = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-top:8px">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px">🏆 Leaderboard</div>
      ${topRows}
      ${mine}
    </div>`;

  return wrapHtml("", `${results.length} match${results.length > 1 ? "es" : ""} wrapped up today`, cards + cta + leaderboard, email);
}

function recapText(results: RecapResult[]): string {
  return (
    results.map((r) => `${r.home_team} ${r.home_score}-${r.away_score} ${r.away_team}`).join("\n") +
    `\n\nPredict tomorrow's matches: https://wc26live.org/predict`
  );
}

export async function sendDailyRecapEmail(
  subscribers: { email: string }[],
  results: RecapResult[],
  top: { name: string; points: number }[],
  rankByEmail: Map<string, DigestRank>
): Promise<{ sent: number; failed: number }> {
  if (results.length === 0) return { sent: 0, failed: 0 };
  const subject = `📊 Today's Results — ${results.length} match${results.length > 1 ? "es" : ""}`;
  return sendBatch(
    subscribers,
    subject,
    (email) => recapHtml(results, top, rankByEmail.get(email) ?? null, email),
    recapText(results)
  );
}

// ── Unified Daily Digest ──────────────────────────────────────────────
// One email a day to every subscriber: yesterday's results (with the
// recipient's own outcomes), today's matches to predict (with AI picks), and
// the leaderboard. Replaces the separate Daily Picks, Daily Recap, per-match
// Final-to-free, and Big-Event broadcasts to keep volume inside Resend's free
// tier (~one send per user per day).

function digestSectionTitle(text: string): string {
  return `<div style="font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.04em;margin:18px 0 10px">${text}</div>`;
}

function digestResultCard(r: RecapResult): string {
  const url = `https://wc26live.org/match/${r.match_id}`;
  const meta = stageLabel(r.stage);
  return `
    <a href="${url}" style="display:block;text-decoration:none;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:16px;font-weight:700;color:#fff">${esc(r.home_team)} <span style="color:#666;font-weight:400">vs</span> ${esc(r.away_team)}</div>
        <div style="font-size:19px;font-weight:800;color:#2ecc71">${r.home_score} - ${r.away_score}</div>
      </div>
      <div style="color:#aaa;font-size:12px;margin-top:5px">${recapLine(r)}${meta ? ` · ${meta}` : ""}</div>
    </a>`;
}

function digestPickCard(p: DailyPick): string {
  const url = `https://wc26live.org/match/${p.match_id}`;
  const meta = [stageLabel(p.stage), formatDate(p.utc_date)].filter(Boolean).join(" · ");
  return `
    <a href="${url}" style="display:block;text-decoration:none;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px;margin-bottom:10px">
      <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:5px">${esc(p.home_team)} <span style="color:#666;font-weight:400">vs</span> ${esc(p.away_team)}</div>
      <div style="color:#f0a500;font-size:13px;font-weight:600">🧠 AI Prediction: ${esc(p.favorite)} ${p.favoritePct}%</div>
      <div style="color:#666;font-size:12px;margin-top:5px">${meta}</div>
    </a>`;
}

// Per-recipient "how your predictions did" block, keyed off yesterday's results.
function digestPersonalBlock(results: RecapResult[], picks: PersonalPick[]): string {
  const byId = new Map(results.map((r) => [r.match_id, r] as const));
  const relevant = picks.filter((p) => byId.has(p.match_id));
  if (relevant.length === 0) return "";
  const label = (r: RecapResult, pick: string) =>
    pick === "home" ? `${esc(r.home_team)} to win` : pick === "away" ? `${esc(r.away_team)} to win` : "a draw";
  const rows = relevant
    .map((p) => {
      const r = byId.get(p.match_id)!;
      const head = p.status === "won"
        ? `✅ <b style="color:#fff">${label(r, p.pick)}</b> — <b style="color:#2ecc71">+${p.payout.toLocaleString()} pts</b>`
        : `❌ You picked <b style="color:#fff">${label(r, p.pick)}</b> — didn't land`;
      return `<div style="padding:6px 0;border-bottom:1px solid #1e3a2d"><div style="font-size:13px;color:#ddd">${head}</div><div style="color:#666;font-size:11px;margin-top:1px">${esc(r.home_team)} ${r.home_score}-${r.away_score} ${esc(r.away_team)}</div></div>`;
    })
    .join("");
  const wins = relevant.filter((p) => p.status === "won").length;
  const gained = relevant.reduce((s, p) => s + (p.payout || 0), 0);
  return `
    <div style="background:#10221a;border:1px solid #2ecc71;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="color:#2ecc71;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">📋 Your Predictions</div>
      ${rows}
      <div style="margin-top:10px;font-size:13px;color:#ddd">Your calls: <b style="color:#fff">${wins}/${relevant.length}</b> right${gained > 0 ? `, <b style="color:#2ecc71">+${gained.toLocaleString()} pts</b>` : ""}.</div>
    </div>`;
}

function digestLeaderboard(top: { name: string; points: number }[], myRank: DigestRank | null): string {
  const medals = ["🥇", "🥈", "🥉"];
  const topRows = top
    .map(
      (t, i) =>
        `<div style="display:flex;justify-content:space-between;font-size:14px;color:#ddd;padding:4px 0"><span>${medals[i] || `#${i + 1}`} ${esc(t.name)}</span><span style="color:#f0a500;font-weight:700">${t.points.toLocaleString()} pts</span></div>`
    )
    .join("");
  const mine = myRank
    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:14px;color:#fff">You: <b style="color:#f0a500">#${myRank.rank}</b> — ${myRank.points.toLocaleString()} pts.</div>`
    : `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:14px;color:#aaa">Predict a match to climb the board!</div>`;
  return `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-top:8px">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px">🏆 Prediction Leaderboard</div>
      ${topRows}
      ${mine}
    </div>`;
}

function digestHtml(
  results: RecapResult[],
  picks: DailyPick[],
  top: { name: string; points: number }[],
  myRank: DigestRank | null,
  myPicks: PersonalPick[] | null,
  email: string
): string {
  const parts: string[] = [];
  if (results.length > 0) {
    parts.push(digestSectionTitle("📊 Latest Results"));
    if (myPicks && myPicks.length) parts.push(digestPersonalBlock(results, myPicks));
    parts.push(results.map(digestResultCard).join(""));
  }
  if (picks.length > 0) {
    parts.push(digestSectionTitle("⚽ Predict Today's Matches"));
    parts.push(picks.map(digestPickCard).join(""));
    parts.push(`
      <div style="text-align:center;margin:14px 0 4px">
        <a href="https://wc26live.org/predict" style="display:inline-block;padding:12px 28px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:15px;font-weight:700">Make Your Predictions →</a>
      </div>`);
  }
  parts.push(digestLeaderboard(top, myRank));
  const subtitle = picks.length
    ? `${picks.length} match${picks.length > 1 ? "es" : ""} to predict today`
    : "Today's World Cup results";
  return wrapHtml("", subtitle, parts.join(""), email);
}

function digestText(results: RecapResult[], picks: DailyPick[]): string {
  const r = results.length
    ? "Results:\n" + results.map((x) => `${x.home_team} ${x.home_score}-${x.away_score} ${x.away_team}`).join("\n") + "\n\n"
    : "";
  const p = picks.length
    ? "Predict today:\n" + picks.map((x) => `${x.home_team} vs ${x.away_team} — AI: ${x.favorite} ${x.favoritePct}%`).join("\n") + "\n\n"
    : "";
  return `${r}${p}Play & climb the leaderboard: https://wc26live.org/predict`;
}

export async function sendDailyDigestEmail(
  subscribers: { email: string }[],
  results: RecapResult[],
  picks: DailyPick[],
  top: { name: string; points: number }[],
  rankByEmail: Map<string, DigestRank>,
  settledByEmail: Map<string, PersonalPick[]>
): Promise<{ sent: number; failed: number }> {
  if (subscribers.length === 0) return { sent: 0, failed: 0 };
  if (results.length === 0 && picks.length === 0) return { sent: 0, failed: 0 };
  const subject = picks.length
    ? `⚽ WC26 Daily — ${picks.length} match${picks.length > 1 ? "es" : ""} to predict`
    : `📊 WC26 Daily — ${results.length} result${results.length > 1 ? "s" : ""}`;
  return sendBatch(
    subscribers,
    subject,
    (email) => digestHtml(results, picks, top, rankByEmail.get(email) ?? null, settledByEmail.get(email) ?? null, email),
    digestText(results, picks)
  );
}

// ── "Join the prediction game" re-engagement email ──

// The soonest upcoming match + its AI prediction, to give the invite email a
// concrete, time-sensitive hook ("predict this before kickoff").
export interface NextMatchInfo {
  home: string;
  away: string;
  utc_date: string;
  match_id: string;
  stage: string | null;
  favorite: string; // team name, or "Draw"
  favoritePct: number;
}

function nextMatchCard(nm: NextMatchInfo): string {
  const matchUrl = `https://wc26live.org/match/${nm.match_id}`;
  const meta = [stageLabel(nm.stage), formatDate(nm.utc_date)].filter(Boolean).join(" · ");
  return `
    <div style="background:#1a1a1a;border:1px solid #3498db;border-radius:8px;padding:20px;margin-bottom:16px">
      <div style="display:inline-block;background:#3498db;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;margin-bottom:12px;color:#fff">⏱ NEXT MATCH</div>
      <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px">${esc(nm.home)} <span style="color:#666;font-weight:400">vs</span> ${esc(nm.away)}</div>
      <div style="color:#3498db;font-size:15px;font-weight:600;margin-top:6px">${countdownText(nm.utc_date)}</div>
      <div style="background:#0f0f0f;border:1px solid #222;border-radius:6px;padding:10px 12px;margin-top:12px">
        <div style="color:#f0a500;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">🧠 Our AI Prediction</div>
        <div style="font-size:15px;color:#fff;font-weight:600">${esc(nm.favorite)} <span style="color:#f0a500">${nm.favoritePct}%</span></div>
      </div>
      <div style="color:#666;font-size:12px;margin-top:8px">${meta}</div>
      <a href="${matchUrl}" style="display:inline-block;margin-top:14px;padding:10px 24px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700">Make Your Prediction before kickoff →</a>
    </div>`;
}

function inviteHtml(
  top: { name: string; points: number }[],
  myRank: DigestRank | null,
  email: string,
  nextMatch?: NextMatchInfo | null
): string {
  const rankLine = myRank
    ? `You're <b style="color:#f0a500">#${myRank.rank}</b> on the leaderboard with <b style="color:#fff">${myRank.points.toLocaleString()}</b> points.`
    : `You've got <b style="color:#fff">1,000</b> starting points on the leaderboard.`;

  const hero = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:22px;margin-bottom:16px;text-align:center">
      <div style="font-size:34px;margin-bottom:8px">🏆</div>
      <div style="font-size:17px;color:#ddd;line-height:1.5">${rankLine}</div>
      <div style="font-size:14px;color:#999;margin-top:10px">But you haven't made a single prediction yet — so you're stuck at your starting score. Predict the match below to win points and start climbing.</div>
    </div>`;

  const next = nextMatch ? nextMatchCard(nextMatch) : "";

  const medals = ["🥇", "🥈", "🥉"];
  const topRows = top
    .map(
      (t, i) =>
        `<div style="display:flex;justify-content:space-between;font-size:14px;color:#ddd;padding:4px 0"><span>${medals[i] || `#${i + 1}`} ${esc(t.name)}</span><span style="color:#f0a500;font-weight:700">${t.points.toLocaleString()} pts</span></div>`
    )
    .join("");

  const mine = myRank
    ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #333;font-size:14px;color:#fff">You: <b style="color:#f0a500">#${myRank.rank}</b> — ${myRank.points.toLocaleString()} pts. <span style="color:#aaa">Time to move up.</span></div>`
    : "";

  const leaderboard = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px">🏆 Prediction Leaderboard</div>
      ${topRows}
      ${mine}
    </div>`;

  const cta = `
    <div style="text-align:center;margin:18px 0 8px">
      <a href="${nextMatch ? `https://wc26live.org/match/${nextMatch.match_id}` : "https://wc26live.org/predict"}" style="display:inline-block;padding:13px 30px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:15px;font-weight:700">Make Your First Prediction →</a>
    </div>
    <p style="text-align:center;color:#666;font-size:12px;margin:6px 0 0">100% free · virtual points · just for fun</p>`;

  return wrapHtml("", "Claim your spot on the leaderboard", hero + next + leaderboard + cta, email);
}

function inviteText(myRank: DigestRank | null, nextMatch?: NextMatchInfo | null): string {
  const r = myRank ? `You're #${myRank.rank} with ${myRank.points} points. ` : "";
  const nm = nextMatch
    ? `Next match: ${nextMatch.home} vs ${nextMatch.away} — ${countdownText(nextMatch.utc_date)}. Our AI prediction: ${nextMatch.favorite} ${nextMatch.favoritePct}%. `
    : "";
  return `${r}But you haven't predicted yet. ${nm}Make your prediction and start climbing the leaderboard: ${nextMatch ? `https://wc26live.org/match/${nextMatch.match_id}` : "https://wc26live.org/predict"}`;
}

export async function sendInvitePredictEmail(
  subscribers: { email: string }[],
  top: { name: string; points: number }[],
  rankByEmail: Map<string, DigestRank>,
  nextMatch?: NextMatchInfo | null
): Promise<{ sent: number; failed: number }> {
  if (subscribers.length === 0) return { sent: 0, failed: 0 };
  const subject = nextMatch
    ? `⏱ ${nextMatch.home} vs ${nextMatch.away} is coming — make your prediction`
    : "🏆 You're on the WC26 leaderboard — claim your spot";
  return sendBatch(
    subscribers,
    subject,
    (email) => inviteHtml(top, rankByEmail.get(email) ?? null, email, nextMatch),
    inviteText(null, nextMatch)
  );
}

// ── Pre-match reminder emails ──

function countdownText(utcDate: string): string {
  const diff = new Date(utcDate).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins <= 0) return "Kicking off now!";
  if (mins < 60) return `Kicks off in about ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `Kicks off in about ${h}h ${m}min`;
}

function aiProbBlock(m: UpcomingMatch): string {
  if (m.homePct == null || m.drawPct == null || m.awayPct == null) return "";
  const row = (label: string, pct: number) =>
    `<div style="display:flex;justify-content:space-between;font-size:13px;color:#ddd;padding:2px 0"><span>${esc(label)}</span><span style="color:#f0a500;font-weight:700">${pct}%</span></div>`;
  return `
    <div style="background:#0f0f0f;border:1px solid #222;border-radius:6px;padding:10px 12px;margin-top:12px">
      <div style="color:#f0a500;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">🧠 AI Win Probability</div>
      ${row(m.home_team, m.homePct)}
      ${row("Draw", m.drawPct)}
      ${row(m.away_team, m.awayPct)}
    </div>`;
}

function prematchHtml(matches: UpcomingMatch[], email?: string): string {
  const cards = matches.map((m) => {
    const stageLine = stageLabel(m.stage);
    const dateLine = formatDate(m.utc_date);
    const countdown = countdownText(m.utc_date);
    const matchUrl = m.match_id ? `https://wc26live.org/match/${m.match_id}` : "https://wc26live.org";

    return `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:16px">
      <div style="display:inline-block;background:#3498db;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;margin-bottom:12px;color:#fff">STARTING SOON</div>
      <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px">
        ${esc(m.home_team)} vs ${esc(m.away_team)}
      </div>
      <div style="color:#3498db;font-size:15px;font-weight:600;margin-top:6px">${countdown}</div>
      ${aiProbBlock(m)}
      <div style="color:#666;font-size:12px;margin-top:8px">${[stageLine, dateLine].filter(Boolean).join(" · ")}</div>
      <a href="${matchUrl}" style="display:inline-block;margin-top:14px;padding:8px 20px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700">Make Your Prediction →</a>
    </div>`;
  }).join("");

  return wrapHtml("", `${matches.length} match${matches.length > 1 ? "es" : ""} starting soon — predict now`, cards, email);
}

function prematchText(matches: UpcomingMatch[]): string {
  return matches
    .map((m) => {
      const ai = m.homePct != null ? ` | AI: ${m.home_team} ${m.homePct}% / Draw ${m.drawPct}% / ${m.away_team} ${m.awayPct}%` : "";
      return `STARTING SOON | ${m.home_team} vs ${m.away_team} | ${countdownText(m.utc_date)}${ai} | Predict: https://wc26live.org/match/${m.match_id}`;
    })
    .join("\n");
}

export async function sendPrematchEmails(
  subscribers: { email: string }[],
  matches: UpcomingMatch[]
): Promise<{ sent: number; failed: number }> {
  if (matches.length === 0) return { sent: 0, failed: 0 };
  const subject = `Match Reminder — ${matches[0].home_team} vs ${matches[0].away_team}${matches.length > 1 ? ` (+${matches.length - 1} more)` : ""}`;
  return sendBatch(subscribers, subject, (email) => prematchHtml(matches, email), prematchText(matches));
}

// ── Kickoff alerts ──

function kickoffHtml(changes: ScoreChange[], email?: string): string {
  // Kickoff alerts are premium-only — no upsell to paying users.
  const cards = changes.map((c) => matchCardHtml(c, "#f0a500", "KICKOFF")).join("");
  return wrapHtml("", `${changes.length} match${changes.length > 1 ? "es" : ""} just started`, cards, email);
}

function kickoffText(changes: ScoreChange[]): string {
  return changes
    .map((c) => `KICKOFF | ${c.home_team} ${c.home_score} - ${c.away_score} ${c.away_team} | ${stageLabel(c.stage)} | ${formatDate(c.utc_date)}`)
    .join("\n");
}

export async function sendKickoffEmails(
  subscribers: { email: string }[],
  changes: ScoreChange[]
): Promise<{ sent: number; failed: number }> {
  if (changes.length === 0) return { sent: 0, failed: 0 };
  const subject = `KICKOFF — ${changes[0].home_team} vs ${changes[0].away_team}${changes.length > 1 ? ` (+${changes.length - 1} more)` : ""}`;
  return sendBatch(subscribers, subject, (email) => kickoffHtml(changes, email), kickoffText(changes));
}

// ── Goal alerts ──

function goalLine(c: ScoreChange): string {
  if (c.scorer) {
    const min = c.goal_minute ? `${c.goal_minute}' ` : "";
    const assist = c.assist ? ` <span style="color:#aaa;font-weight:400">(assist: ${esc(c.assist)})</span>` : "";
    return `⚽ ${min}${esc(c.scorer)}${assist}`;
  }
  return goalNarrative(c);
}

function goalHtml(changes: ScoreChange[], email?: string): string {
  // Goal alerts are premium-only — no upsell to paying users.
  const cards = changes.map((c) => matchCardHtml(c, "#e74c3c", "GOAL", goalLine(c))).join("");
  return wrapHtml("", `${changes.length} match${changes.length > 1 ? "es" : ""} with new goals`, cards, email);
}

function goalText(changes: ScoreChange[]): string {
  return changes
    .map((c) => {
      const who = c.scorer ? ` | ⚽ ${c.goal_minute ? c.goal_minute + "' " : ""}${c.scorer}` : "";
      return `GOAL | ${c.home_team} ${c.home_score} - ${c.away_score} ${c.away_team}${who} | ${stageLabel(c.stage)}`;
    })
    .join("\n");
}

export async function sendGoalEmails(
  subscribers: { email: string }[],
  changes: ScoreChange[]
): Promise<{ sent: number; failed: number }> {
  if (changes.length === 0) return { sent: 0, failed: 0 };
  const subject = `GOAL! ${changes[0].home_team} ${changes[0].home_score} - ${changes[0].away_score} ${changes[0].away_team}${changes.length > 1 ? ` (+${changes.length - 1} more)` : ""}`;
  return sendBatch(subscribers, subject, (email) => goalHtml(changes, email), goalText(changes));
}

// ── Final-score (post-match) emails ──

// A recipient's settled pick on a just-finished match, for the personalized
// Final email. `pick` is "home" | "away" | "draw".
export interface PersonalPick {
  match_id: string;
  pick: string;
  status: string; // "won" | "lost"
  payout: number;
}

function pickLabel(c: ScoreChange, pick: string): string {
  if (pick === "home") return `${esc(c.home_team)} to win`;
  if (pick === "away") return `${esc(c.away_team)} to win`;
  return "a draw";
}

// Personal "how your predictions did" block, shown above the generic score
// cards for recipients who predicted one of the finished matches.
function personalResultBlock(
  changes: ScoreChange[],
  picks: PersonalPick[],
  rank: DigestRank | null
): string {
  const byId = new Map(changes.map((c) => [c.match_id, c] as const));
  const relevant = picks.filter((p) => byId.has(p.match_id));
  if (relevant.length === 0) return "";

  const rows = relevant
    .map((p) => {
      const c = byId.get(p.match_id)!;
      const score = `${esc(c.home_team)} ${c.home_score}-${c.away_score} ${esc(c.away_team)}`;
      const won = p.status === "won";
      const head = won
        ? `✅ <b style="color:#fff">${pickLabel(c, p.pick)}</b> — nailed it! <b style="color:#2ecc71">+${p.payout.toLocaleString()} pts</b>`
        : `❌ You picked <b style="color:#fff">${pickLabel(c, p.pick)}</b> — didn't land`;
      return `<div style="padding:8px 0;border-bottom:1px solid #1e3a2d">
        <div style="font-size:14px;color:#ddd">${head}</div>
        <div style="color:#666;font-size:12px;margin-top:2px">${score}</div>
      </div>`;
    })
    .join("");

  const wins = relevant.filter((p) => p.status === "won").length;
  const gained = relevant.reduce((s, p) => s + (p.payout || 0), 0);
  const rankLine = rank
    ? ` You're now <b style="color:#f0a500">#${rank.rank}</b> — ${rank.points.toLocaleString()} pts.`
    : "";
  const summary = `Your call${relevant.length > 1 ? "s" : ""}: <b style="color:#fff">${wins}/${relevant.length}</b> right${gained > 0 ? `, <b style="color:#2ecc71">+${gained.toLocaleString()} pts</b>` : ""}.${rankLine}`;

  return `
    <div style="background:#10221a;border:1px solid #2ecc71;border-radius:8px;padding:18px;margin-bottom:16px">
      <div style="color:#2ecc71;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">📋 Your Predictions</div>
      ${rows}
      <div style="margin-top:12px;font-size:14px;color:#ddd">${summary}</div>
      <div style="text-align:center;margin-top:14px">
        <a href="https://wc26live.org/leaderboard" style="display:inline-block;padding:9px 22px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700">See the Leaderboard →</a>
      </div>
    </div>`;
}

function finalHtml(
  changes: ScoreChange[],
  email?: string,
  showPromo = false,
  picks?: PersonalPick[],
  rank?: DigestRank | null
): string {
  const personal = picks && picks.length ? personalResultBlock(changes, picks, rank ?? null) : "";
  const cards = changes.map((c) => matchCardHtml(c, "#2ecc71", "FINAL", matchSummary(c))).join("");
  return wrapHtml("", `${changes.length} match${changes.length > 1 ? "es" : ""} finished`, personal + cards + (showPromo ? promoBlock() : ""), email);
}

function finalText(changes: ScoreChange[]): string {
  return changes
    .map((c) => {
      const ht = (c.half_time_home != null && c.half_time_away != null) ? ` (HT: ${c.half_time_home}-${c.half_time_away})` : "";
      return `FINAL | ${c.home_team} ${c.home_score} - ${c.away_score} ${c.away_team}${ht} | ${stageLabel(c.stage)}`;
    })
    .join("\n");
}

export async function sendFinalEmails(
  subscribers: { email: string; preferences?: string }[],
  changes: ScoreChange[],
  picksByEmail?: Map<string, PersonalPick[]>,
  rankByEmail?: Map<string, DigestRank>
): Promise<{ sent: number; failed: number }> {
  if (changes.length === 0) return { sent: 0, failed: 0 };
  // Promo only goes to free subscribers — premium users already bought the pass.
  const premium = new Set(subscribers.filter((s) => s.preferences === "premium").map((s) => s.email));
  const subject = `FINAL — ${changes[0].home_team} ${changes[0].home_score} - ${changes[0].away_score} ${changes[0].away_team}${changes.length > 1 ? ` (+${changes.length - 1} more)` : ""}`;
  return sendBatch(
    subscribers,
    subject,
    (email) => finalHtml(changes, email, !premium.has(email), picksByEmail?.get(email), rankByEmail?.get(email)),
    finalText(changes)
  );
}

// ── Big Event / Upset alert (sent to everyone — drives re-engagement) ──

export interface BigEvent {
  change: ScoreChange;
  aiPct: number; // AI-assigned probability (%) of the result that actually happened
  playerPct: number | null; // % of players who predicted it (null if too few picks)
}

function upsetHeadline(c: ScoreChange): { tag: string; line: string } {
  if (c.home_score === c.away_score) {
    return { tag: "SHOCK DRAW", line: `${esc(c.home_team)} and ${esc(c.away_team)} play out a stunning ${c.home_score}-${c.away_score} draw` };
  }
  const homeWon = c.home_score > c.away_score;
  const w = homeWon ? c.home_team : c.away_team;
  const l = homeWon ? c.away_team : c.home_team;
  return { tag: "HUGE UPSET", line: `${esc(w)} stun ${esc(l)} ${Math.max(c.home_score, c.away_score)}-${Math.min(c.home_score, c.away_score)}` };
}

function bigEventHtml(e: BigEvent, email?: string): string {
  const { change: c, aiPct, playerPct } = e;
  const { line } = upsetHeadline(c);
  const matchUrl = c.match_id ? `https://wc26live.org/match/${c.match_id}` : "https://wc26live.org";
  const rarity =
    playerPct != null
      ? `Only <b style="color:#e74c3c">${playerPct}%</b> of players called it — the AI gave it just a ${aiPct}% chance.`
      : `The AI gave this result only a <b style="color:#e74c3c">${aiPct}%</b> chance.`;
  const body = `
    <div style="background:#1a1a1a;border:1px solid #e74c3c;border-radius:8px;padding:22px;margin-bottom:16px">
      <div style="display:inline-block;background:#e74c3c;padding:3px 12px;border-radius:4px;font-size:11px;font-weight:700;margin-bottom:14px;color:#fff">🚨 ${upsetHeadline(c).tag}</div>
      <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:6px">${line}</div>
      <div style="font-size:20px;color:#f0a500;font-weight:700;margin-bottom:10px">${esc(c.home_team)} ${c.home_score} - ${c.away_score} ${esc(c.away_team)}</div>
      <div style="color:#ccc;font-size:14px;line-height:1.5">${rarity}</div>
      <div style="color:#666;font-size:12px;margin-top:8px">${stageLabel(c.stage)}</div>
      <a href="${matchUrl}" style="display:inline-block;margin-top:14px;padding:8px 20px;background:#e74c3c;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">View Match →</a>
    </div>
    <div style="text-align:center;margin:8px 0 4px">
      <a href="https://wc26live.org/leaderboard" style="display:inline-block;padding:11px 26px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700">See the Leaderboard →</a>
    </div>`;
  return wrapHtml("", "An upset just shook up the World Cup", body, email);
}

function bigEventText(e: BigEvent): string {
  const { change: c, aiPct, playerPct } = e;
  const odds = playerPct != null ? `Only ${playerPct}% of players called it (AI: ${aiPct}%).` : `AI gave it a ${aiPct}% chance.`;
  return `${upsetHeadline(c).tag}: ${c.home_team} ${c.home_score}-${c.away_score} ${c.away_team}. ${odds}\nSee the leaderboard: https://wc26live.org/leaderboard`;
}

export async function sendBigEventEmails(
  subscribers: { email: string }[],
  event: BigEvent
): Promise<{ sent: number; failed: number }> {
  const { change: c } = event;
  const { tag } = upsetHeadline(c);
  const subject = `🚨 ${tag}: ${c.home_team} ${c.home_score}-${c.away_score} ${c.away_team}`;
  return sendBatch(subscribers, subject, (email) => bigEventHtml(event, email), bigEventText(event));
}
