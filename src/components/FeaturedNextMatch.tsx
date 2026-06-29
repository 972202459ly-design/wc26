"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Lock, Heart, ThumbsDown, Send } from "lucide-react";
import PredictionSaveGate from "./PredictionSaveGate";
import AmazonImageAd from "./AmazonImageAd";
import { amazonSearchLink, stageLabel } from "@/lib/data";

interface DayMatch {
  id: string;
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
  utc_date: string;
  stage: string;
  group: string;
  status: "upcoming" | "live" | "finished";
  homeScore: number | null;
  awayScore: number | null;
  prediction: { homePct: number; drawPct: number; awayPct: number; scoreHome: number; scoreAway: number };
}

interface Preview {
  teaser: string | null;
  full: string | null;
  locked: boolean;
}

interface Comment {
  id: number;
  username: string;
  body: string;
  likes: number;
  dislikes: number;
  created_at: string;
}

const EMOJIS = [
  { key: "fire", icon: "🔥", label: "Fire" },
  { key: "ball", icon: "⚽", label: "Goal" },
  { key: "shock", icon: "😮", label: "Shock" },
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// Times render in the visitor's own timezone (this widget is client-only and
// hydrates after fetch, so there's no SSR/hydration concern).
function localHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function localDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Short GMT offset for the visitor's timezone, e.g. "GMT+8".
function localOffsetLabel() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "shortOffset",
      hour: "numeric",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

function Flag({ src, size = 36 }: { src: string; size?: number }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded-sm shadow"
    />
  );
}

export default function FeaturedNextMatch() {
  const [matches, setMatches] = useState<DayMatch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [flashId, setFlashId] = useState<string | null>(null);

  // Per-match UI state (reset on tab switch)
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [disliked, setDisliked] = useState<Set<number>>(new Set());
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const userPickedRef = useRef(false);   // true after user manually clicks a tab
  const prevScoresRef = useRef<Map<string, string>>(new Map()); // matchId → "h-a"

  // 1-second ticker for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/request")
      .then((r) => { if (r.ok) setAuthed(true); })
      .catch(() => {});
  }, []);

  // Load today's matches + adaptive polling (15 s live, 30 s otherwise)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let firstLoad = true;

    async function poll() {
      try {
        const data: DayMatch[] = await fetch("/api/today-matches").then((r) => r.json());

        // Detect score changes → flash
        data.forEach((m) => {
          if (m.homeScore === null) return;
          const key = `${m.homeScore}-${m.awayScore}`;
          const prev = prevScoresRef.current.get(m.id);
          if (prev !== undefined && prev !== key) {
            setFlashId(m.id);
            setTimeout(() => setFlashId(null), 1800);
          }
          prevScoresRef.current.set(m.id, key);
        });

        setMatches(data);

        if (firstLoad) {
          firstLoad = false;
          const live = data.find((m) => m.status === "live");
          const upcoming = data.find((m) => m.status === "upcoming");
          setSelectedId((live ?? upcoming ?? data[0])?.id ?? null);
          setLoaded(true);
        } else if (!userPickedRef.current) {
          // Auto-follow a newly-live match
          const live = data.find((m) => m.status === "live");
          if (live) setSelectedId(live.id);
        }

        const hasLive = data.some((m) => m.status === "live");
        timer = setTimeout(poll, hasLive ? 30_000 : 60_000);
      } catch {
        timer = setTimeout(poll, 30_000);
      }
    }

    poll();
    return () => clearTimeout(timer);
  }, []);

  // When selected tab changes: reset + load reactions, comments, AI preview
  useEffect(() => {
    if (!selectedId) return;

    setPreview(null);
    setComments([]);
    setReactions({});
    setBody("");

    try {
      const r = JSON.parse(localStorage.getItem(`wc26_rx_${selectedId}`) ?? "[]");
      setReacted(new Set(Array.isArray(r) ? r : []));
      const l = JSON.parse(localStorage.getItem(`wc26_lk_${selectedId}`) ?? "[]");
      setLiked(new Set(Array.isArray(l) ? l : []));
      const d = JSON.parse(localStorage.getItem(`wc26_dk_${selectedId}`) ?? "[]");
      setDisliked(new Set(Array.isArray(d) ? d : []));
    } catch {}

    Promise.all([
      fetch(`/api/reactions/${selectedId}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/comments/${selectedId}`).then((r) => r.json()).catch(() => ({ comments: [] })),
    ]).then(([rx, cm]) => {
      setReactions(rx ?? {});
      setComments(cm.comments ?? []);
    });

    // AI preview for non-finished matches
    const m = matches.find((x) => x.id === selectedId);
    if (m && m.status !== "finished") {
      setPreviewLoading(true);
      fetch(`/api/match-preview/${selectedId}`)
        .then((r) => r.json())
        .then((d) => setPreview(d))
        .catch(() => {})
        .finally(() => setPreviewLoading(false));
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReact(key: string) {
    if (!selectedId || reacted.has(key)) return;
    setReactions((p) => ({ ...p, [key]: (p[key] ?? 0) + 1 }));
    const next = new Set(reacted).add(key);
    setReacted(next);
    try { localStorage.setItem(`wc26_rx_${selectedId}`, JSON.stringify([...next])); } catch {}
    fetch(`/api/reactions/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: key }),
    }).catch(() => {});
  }

  async function handleLike(cid: number) {
    if (!selectedId || liked.has(cid) || disliked.has(cid)) return;
    setComments((p) => p.map((c) => c.id === cid ? { ...c, likes: c.likes + 1 } : c));
    const next = new Set(liked).add(cid);
    setLiked(next);
    try { localStorage.setItem(`wc26_lk_${selectedId}`, JSON.stringify([...next])); } catch {}
    fetch(`/api/comments/${selectedId}/${cid}/like`, { method: "POST" }).catch(() => {});
  }

  async function handleDislike(cid: number) {
    if (!selectedId || liked.has(cid) || disliked.has(cid)) return;
    setComments((p) => p.map((c) => c.id === cid ? { ...c, dislikes: c.dislikes + 1 } : c));
    const next = new Set(disliked).add(cid);
    setDisliked(next);
    try { localStorage.setItem(`wc26_dk_${selectedId}`, JSON.stringify([...next])); } catch {}
    fetch(`/api/comments/${selectedId}/${cid}/dislike`, { method: "POST" }).catch(() => {});
  }

  async function handlePost() {
    if (!selectedId || !body.trim() || posting) return;
    if (!authed) { setGateOpen(true); return; }
    setPosting(true);
    try {
      const res = await fetch(`/api/comments/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.ok) {
        const { comment } = await res.json();
        setComments((p) => [comment, ...p]);
        setBody("");
      }
    } finally {
      setPosting(false);
    }
  }

  if (!loaded || !matches.length) return null;

  const selected = matches.find((m) => m.id === selectedId);
  if (!selected) return null;

  const koMs = new Date(selected.utc_date).getTime();
  const diff = Math.max(0, Math.floor((koMs - now) / 1000));
  const days = Math.floor(diff / 86400);
  const clock =
    selected.status === "upcoming"
      ? `${days > 0 ? days + "d " : ""}${pad(Math.floor((diff % 86400) / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`
      : null;

  const pred = selected.prediction;
  const probRows = [
    { label: selected.home, pct: pred.homePct, color: "#f0a500" },
    { label: "Draw", pct: pred.drawPct, color: "#6b7280" },
    { label: selected.away, pct: pred.awayPct, color: "#3498db" },
  ];
  const topComments = [...comments].sort((a, b) => b.likes - a.likes).slice(0, 3);

  const dateLabel = localDayLabel(matches[0].utc_date);
  const tzLabel = localOffsetLabel();

  return (
    <section className="mx-auto mb-10 max-w-2xl px-4">

      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#f0a500]">
          <Sparkles className="h-3.5 w-3.5" />
          Live &amp; Upcoming
        </span>
        <span className="text-xs text-[#555]">{dateLabel}{tzLabel ? ` · ${tzLabel}` : ""}</span>
      </div>

      {/* Match tab chips */}
      <div
        className="mb-3 flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {matches.map((m) => {
          const sel = m.id === selectedId;
          const [homeTla, awayTla] = m.id.split("-");
          return (
            <button
              key={m.id}
              onClick={() => { userPickedRef.current = true; setSelectedId(m.id); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                sel
                  ? "border-[#f0a500]/60 bg-[#f0a500]/10 text-white"
                  : "border-[#222] bg-[#0d0d0d] text-[#777] hover:border-[#444] hover:text-white"
              }`}
            >
              {/* Status dot */}
              {m.status === "live" && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              )}
              {m.status === "finished" && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#444]" />
              )}
              {m.status === "upcoming" && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0a500]/50" />
              )}

              <span className="uppercase">
                {homeTla} vs {awayTla}
              </span>

              {/* Score or time */}
              {m.status === "live" && m.homeScore !== null && (
                <span className={`font-bold transition-colors duration-300 ${flashId === m.id ? "text-yellow-300" : "text-green-400"}`}>
                  {m.homeScore}–{m.awayScore}
                </span>
              )}
              {m.status === "finished" && m.homeScore !== null && (
                <span className="text-[#555]">
                  {m.homeScore}–{m.awayScore}
                </span>
              )}
              {m.status === "upcoming" && (
                <span className={sel ? "text-[#f0a500]" : "text-[#555]"}>
                  {localHHMM(m.utc_date)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Match card */}
      <div className="overflow-hidden rounded-2xl border border-[#f0a500]/30 bg-gradient-to-br from-[#1a1a2e] to-[#0e0e0e]">

        {/* Card top bar */}
        <div className="flex items-center justify-between border-b border-[#222] px-6 py-3">
          <span className="text-xs font-semibold text-[#666]">
            {stageLabel(selected.stage)}{selected.group ? ` · ${selected.group}` : ""}
          </span>
          <span
            className={`text-xs font-bold ${
              selected.status === "live"
                ? "flex items-center gap-1.5 text-green-400"
                : selected.status === "finished"
                ? "text-[#555]"
                : "font-mono tabular-nums text-white"
            }`}
          >
            {selected.status === "live" && (
              <>
                <span className="live-dot" />
                LIVE
              </>
            )}
            {selected.status === "finished" && "FULL TIME"}
            {selected.status === "upcoming" && clock && `⏳ ${clock}`}
          </span>
        </div>

        {/* Teams + scoreline */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <Flag src={selected.homeFlag} size={40} />
              <span className="text-sm font-semibold text-white leading-tight">
                {selected.home}
              </span>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              {selected.status !== "upcoming" && selected.homeScore !== null ? (
                <div
                  className={`text-5xl font-extrabold tabular-nums sm:text-6xl transition-colors duration-300 ${
                    flashId === selected.id
                      ? "text-yellow-300"
                      : selected.status === "live"
                      ? "text-green-400"
                      : "text-[#888]"
                  }`}
                >
                  {selected.homeScore}
                  <span className="mx-1 text-[#444]">–</span>
                  {selected.awayScore}
                </div>
              ) : (
                <>
                  <div className="text-5xl font-extrabold tabular-nums text-[#f0a500] sm:text-6xl">
                    {pred.scoreHome}
                    <span className="mx-1 text-[#555]">–</span>
                    {pred.scoreAway}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-[#555]">
                    AI Predicted
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-1 flex-col items-center gap-1.5">
              <Flag src={selected.awayFlag} size={40} />
              <span className="text-sm font-semibold text-white leading-tight">
                {selected.away}
              </span>
            </div>
          </div>
        </div>

        {/* Winner badge + jersey hook (finished only) */}
        {selected.status === "finished" && selected.homeScore !== null && (
          <div className="px-6 pb-3 flex flex-wrap items-center justify-center gap-2">
            {selected.homeScore > selected.awayScore! ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0a500]/10 px-3 py-1 text-xs font-bold text-[#f0a500]">
                  🏆 {selected.home} wins
                </span>
                <a
                  href={amazonSearchLink("soccer watch party supplies speaker")}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[#222] border border-[#333] px-3 py-1 text-xs text-[#aaa] hover:text-white hover:border-[#f0a500]/40 transition-all"
                >
                  🎉 Watch Party Gear →
                </a>
              </>
            ) : selected.awayScore! > selected.homeScore ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3498db]/10 px-3 py-1 text-xs font-bold text-[#3498db]">
                  🏆 {selected.away} wins
                </span>
                <a
                  href={amazonSearchLink("soccer watch party supplies speaker")}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[#222] border border-[#333] px-3 py-1 text-xs text-[#aaa] hover:text-white hover:border-[#3498db]/40 transition-all"
                >
                  🎉 Watch Party Gear →
                </a>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6b7280]/10 px-3 py-1 text-xs font-bold text-[#9ca3af]">
                🤝 Draw
              </span>
            )}
          </div>
        )}

        {/* Win probability bars */}
        <div className="px-6 pb-5">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[#f0a500]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
              {selected.status === "finished" ? "Pre-match Prediction" : "AI Win Probability"}
            </span>
          </div>
          <div className="space-y-2">
            {probRows.map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-[#ccc]">{r.label}</span>
                  <span className="font-semibold text-white">{r.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1e1e1e]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${r.pct}%`, background: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image ad — match-day gear for live/upcoming, watch party for finished */}
        <AmazonImageAd variant={selected.status === "finished" ? "party" : "prime"} />

        {/* AI preview (upcoming / live only) */}
        {selected.status !== "finished" && (
          <div className="border-t border-[#222] px-6 py-4">
            {previewLoading && (
              <div className="space-y-2">
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-[#1e1e1e]" />
                <div className="h-3.5 w-4/6 animate-pulse rounded bg-[#1e1e1e]" />
              </div>
            )}
            {!previewLoading && preview?.teaser && (
              <>
                <p className="text-sm leading-relaxed text-[#ddd]">
                  {preview.full ?? preview.teaser}
                </p>
                {preview.locked && (
                  <Link
                    href="/premium"
                    className="mt-3 flex items-center gap-2.5 rounded-lg border border-[#f0a500]/40 bg-[#1a1a2e] px-4 py-3 transition-colors hover:bg-[#20203a]"
                  >
                    <Lock className="h-4 w-4 shrink-0 text-[#f0a500]" />
                    <span className="text-sm text-[#ddd]">
                      <b className="text-[#f0a500]">Unlock the full AI breakdown + value pick</b> with Pro — $7.99 →
                    </span>
                  </Link>
                )}
              </>
            )}
            {!previewLoading && !preview?.teaser && (
              <p className="text-sm text-[#555]">
                Pre-match briefing will appear closer to kickoff.
              </p>
            )}
          </div>
        )}

        {/* Fan Discussion */}
        <div className="border-t border-[#222] px-6 pt-5 pb-2">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#777]">
              Fan Discussion
              {comments.length > 0 && (
                <span className="ml-2 font-normal normal-case text-[#555]">
                  · {comments.length}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {EMOJIS.map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => handleReact(key)}
                  aria-label={`React: ${label}`}
                  title={label}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                    reacted.has(key)
                      ? "cursor-default bg-[#f0a500]/20 text-[#f0a500]"
                      : "bg-[#181818] text-[#777] hover:bg-[#242424] hover:text-white"
                  }`}
                >
                  {icon}
                  {(reactions[key] ?? 0) > 0 && (
                    <span>{reactions[key]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Top 3 comments */}
          {topComments.length > 0 ? (
            <div className="mb-4 space-y-3">
              {topComments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a2a4e] text-xs font-bold text-[#f0a500]">
                    {c.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-white">
                        {c.username}
                      </span>
                      <span className="text-[10px] text-[#555]">
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm leading-snug text-[#ccc]">{c.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
                    <button
                      onClick={() => handleLike(c.id)}
                      disabled={liked.has(c.id) || disliked.has(c.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        liked.has(c.id)
                          ? "text-[#f0a500]"
                          : "text-[#555] hover:text-[#f0a500] disabled:cursor-default"
                      }`}
                    >
                      <Heart
                        className="h-3.5 w-3.5"
                        fill={liked.has(c.id) ? "currentColor" : "none"}
                      />
                      {c.likes > 0 && <span>{c.likes}</span>}
                    </button>
                    <button
                      onClick={() => handleDislike(c.id)}
                      disabled={liked.has(c.id) || disliked.has(c.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        disliked.has(c.id)
                          ? "text-blue-400"
                          : "text-[#555] hover:text-blue-400 disabled:cursor-default"
                      }`}
                    >
                      <ThumbsDown
                        className="h-3.5 w-3.5"
                        fill={disliked.has(c.id) ? "currentColor" : "none"}
                      />
                      {c.dislikes > 0 && <span>{c.dislikes}</span>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-[#555]">
              No comments yet — be the first!
            </p>
          )}

          {/* Comment input */}
          <div className="mb-3 flex gap-2">
            <textarea
              ref={textRef}
              rows={1}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  authed ? handlePost() : setGateOpen(true);
                }
              }}
              onClick={() => { if (!authed) setGateOpen(true); }}
              placeholder={
                authed ? "Share your thoughts…" : "Sign in free to comment…"
              }
              className="flex-1 resize-none rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#f0a500]/50 focus:outline-none"
            />
            <button
              onClick={() => (authed ? handlePost() : setGateOpen(true))}
              disabled={posting}
              aria-label="Post comment"
              title="Post comment"
              className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-lg bg-[#f0a500] text-black transition-colors hover:bg-[#d49500] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <Link
            href={`/match/${selected.id}`}
            className="mb-3 block text-center text-xs text-[#555] transition-colors hover:text-[#f0a500]"
          >
            {comments.length > 3
              ? `View all ${comments.length} comments`
              : "View full match page"}{" "}
            →
          </Link>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 border-t border-[#222] bg-black/30 px-6 py-4 sm:flex-row sm:justify-between">
          <span className="text-xs text-[#555]">
            Make your prediction · beat the AI
          </span>
          <Link
            href={`/match/${selected.id}`}
            className="rounded-lg bg-[#f0a500] px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#d49500]"
          >
            Make Your Prediction →
          </Link>
        </div>
      </div>

      {gateOpen && (
        <PredictionSaveGate
          pickLabel="comment"
          stake={0}
          onAuthed={() => {
            setAuthed(true);
            setGateOpen(false);
            setTimeout(() => textRef.current?.focus(), 100);
          }}
          onClose={() => setGateOpen(false)}
        />
      )}
    </section>
  );
}
