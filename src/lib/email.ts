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

  const results = await Promise.allSettled(
    subscribers.map((sub) => {
      const unsubscribeUrl = `https://wc26live.org/api/unsubscribe?email=${encodeURIComponent(sub.email)}`;
      return resend!.emails.send({
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
      });
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.error) {
        failed++;
        console.error("Resend send failed:", r.value.error);
      } else {
        sent++;
      }
    } else {
      failed++;
      console.error("Email send failed:", r.reason?.message);
    }
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
        <div style="color:#f0a500;font-size:13px;font-weight:700;margin-bottom:4px">📥 So our alerts don't land in spam</div>
        <p style="color:#aaa;font-size:13px;line-height:1.5;margin:0">
          Add <b style="color:#fff">noreply@wc26live.org</b> to your contacts.
          If you use QQ / 163 / Outlook, please also check your
          <b style="color:#fff">Spam / 垃圾邮件</b> folder and mark us as
          "Not spam" so you never miss a goal.
        </p>
      </div>
      <a href="https://wc26live.org" style="display:inline-block;padding:10px 22px;background:#f0a500;color:#000;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Open WC26 Live →</a>
    </div>`;
  const text = `You're subscribed to WC26 Live match alerts! To make sure our emails reach your inbox, add noreply@wc26live.org to your contacts, and check your spam folder (especially QQ/163/Outlook). wc26live.org`;
  try {
    await resend.emails.send({
      from: "WC26 Live <noreply@wc26live.org>",
      to: email,
      subject: "Welcome to WC26 Live ⚽ — please whitelist us",
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

function prematchHtml(matches: UpcomingMatch[], email?: string): string {
  const cards = matches.map((m) => {
    const stageLine = stageLabel(m.stage);
    const dateLine = formatDate(m.utc_date);
    const countdown = countdownText(m.utc_date);
    const matchUrl = m.match_id ? `https://wc26live.org/match/${m.match_id}` : "https://wc26live.org";

    return `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:16px">
      <div style="display:inline-block;background:#3498db;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;margin-bottom:12px;color:#fff">UPCOMING</div>
      <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px">
        ${esc(m.home_team)} vs ${esc(m.away_team)}
      </div>
      <div style="color:#3498db;font-size:15px;font-weight:600;margin-top:6px">${countdown}</div>
      <div style="color:#666;font-size:12px;margin-top:8px">${[stageLine, dateLine].filter(Boolean).join(" · ")}</div>
      <a href="${matchUrl}" style="display:inline-block;margin-top:14px;padding:8px 20px;background:#3498db;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">View Match →</a>
    </div>`;
  }).join("");

  return wrapHtml("", `${matches.length} match${matches.length > 1 ? "es" : ""} starting soon`, cards, email);
}

function prematchText(matches: UpcomingMatch[]): string {
  return matches
    .map((m) => `UPCOMING | ${m.home_team} vs ${m.away_team} | ${countdownText(m.utc_date)} | ${stageLabel(m.stage)} | ${formatDate(m.utc_date)}`)
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

function goalHtml(changes: ScoreChange[], email?: string): string {
  const cards = changes.map((c) => matchCardHtml(c, "#e74c3c", "GOAL", goalNarrative(c))).join("");
  return wrapHtml("", `${changes.length} match${changes.length > 1 ? "es" : ""} with new goals`, cards, email);
}

function goalText(changes: ScoreChange[]): string {
  return changes
    .map((c) => {
      const prev = (c.prev_home_score != null && c.prev_away_score != null) ? ` (was ${c.prev_home_score}-${c.prev_away_score})` : "";
      return `GOAL | ${c.home_team} ${c.home_score} - ${c.away_score} ${c.away_team}${prev} | ${stageLabel(c.stage)}`;
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

function finalHtml(changes: ScoreChange[], email?: string): string {
  const cards = changes.map((c) => matchCardHtml(c, "#2ecc71", "FINAL", matchSummary(c))).join("");
  return wrapHtml("", `${changes.length} match${changes.length > 1 ? "es" : ""} finished`, cards, email);
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
  subscribers: { email: string }[],
  changes: ScoreChange[]
): Promise<{ sent: number; failed: number }> {
  if (changes.length === 0) return { sent: 0, failed: 0 };
  const subject = `FINAL — ${changes[0].home_team} ${changes[0].home_score} - ${changes[0].away_score} ${changes[0].away_team}${changes.length > 1 ? ` (+${changes.length - 1} more)` : ""}`;
  return sendBatch(subscribers, subject, (email) => finalHtml(changes, email), finalText(changes));
}
