"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, ThumbsDown, MessageCircle } from "lucide-react";
import PredictionSaveGate from "./PredictionSaveGate";

interface Comment {
  id: number;
  username: string;
  body: string;
  likes: number;
  dislikes: number;
  created_at: string;
}

const EMOJIS = [
  { key: "fire", icon: "🔥", label: "Hot match" },
  { key: "ball", icon: "⚽", label: "Goal vibes" },
  { key: "shock", icon: "😮", label: "Upset alert" },
] as const;

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function MatchComments({ matchId }: { matchId: string }) {
  const [reactions, setReactions] = useState<Record<string, number>>({ fire: 0, ball: 0, shock: 0 });
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [disliked, setDisliked] = useState<Set<number>>(new Set());
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState("");
  const [authed, setAuthed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(`wc26_rx_${matchId}`) ?? "[]");
      setReacted(new Set(Array.isArray(r) ? r : []));
      const l = JSON.parse(localStorage.getItem(`wc26_lk_${matchId}`) ?? "[]");
      setLiked(new Set(Array.isArray(l) ? l : []));
      const d = JSON.parse(localStorage.getItem(`wc26_dk_${matchId}`) ?? "[]");
      setDisliked(new Set(Array.isArray(d) ? d : []));
    } catch {}

    fetch("/api/bets")
      .then((r) => { if (r.status !== 401) setAuthed(true); })
      .catch(() => {});

    Promise.all([
      fetch(`/api/reactions/${matchId}`).then((r) => r.json()),
      fetch(`/api/comments/${matchId}`).then((r) => r.json()),
    ])
      .then(([rx, cm]) => {
        setReactions(rx);
        setComments(cm.comments ?? []);
        setCommentCount(cm.comments?.length ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  async function react(emoji: string) {
    if (reacted.has(emoji)) return;
    const next = new Set(reacted).add(emoji);
    setReacted(next);
    try { localStorage.setItem(`wc26_rx_${matchId}`, JSON.stringify([...next])); } catch {}
    const data = await fetch(`/api/reactions/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }).then((r) => r.json()).catch(() => null);
    if (data) setReactions(data);
  }

  async function likeC(id: number) {
    if (liked.has(id) || disliked.has(id)) return;
    const next = new Set(liked).add(id);
    setLiked(next);
    try { localStorage.setItem(`wc26_lk_${matchId}`, JSON.stringify([...next])); } catch {}
    setComments((cs) => cs.map((c) => c.id === id ? { ...c, likes: c.likes + 1 } : c));
    await fetch(`/api/comments/${matchId}/${id}/like`, { method: "POST" }).catch(() => {});
  }

  async function dislikeC(id: number) {
    if (liked.has(id) || disliked.has(id)) return;
    const next = new Set(disliked).add(id);
    setDisliked(next);
    try { localStorage.setItem(`wc26_dk_${matchId}`, JSON.stringify([...next])); } catch {}
    setComments((cs) => cs.map((c) => c.id === id ? { ...c, dislikes: c.dislikes + 1 } : c));
    await fetch(`/api/comments/${matchId}/${id}/dislike`, { method: "POST" }).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (!authed) { setGateOpen(true); return; }
    setPosting(true); setMsg("");
    const r = await fetch(`/api/comments/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);
    if (r?.ok) {
      const d = await r.json();
      setComments((cs) => [d.comment, ...cs].sort((a, b) => b.likes - a.likes));
      setCommentCount((n) => n + 1);
      setBody("");
    } else {
      setMsg("Failed to post. Please try again.");
    }
    setPosting(false);
  }

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <section className="mx-auto mt-8 max-w-3xl px-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-[#f0a500]" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-white">
          Fan Reactions {commentCount > 0 && <span className="ml-1 text-[#888] font-normal normal-case">· {commentCount} comments</span>}
        </h2>
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#111]">
        {/* Reaction bar */}
        <div className="flex items-center gap-3 border-b border-[#1e1e1e] px-5 py-4">
          {EMOJIS.map(({ key, icon, label }) => {
            const count = reactions[key] ?? 0;
            const done = reacted.has(key);
            return (
              <button
                key={key}
                onClick={() => react(key)}
                title={label}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                  done
                    ? "border-[#f0a500]/60 bg-[#f0a500]/10 text-white"
                    : "border-[#2a2a2a] bg-[#0d0d0d] text-[#aaa] hover:border-[#444] hover:text-white"
                }`}
              >
                <span>{icon}</span>
                {count > 0 && <span className="font-semibold tabular-nums">{count}</span>}
              </button>
            );
          })}
          {totalReactions > 0 && (
            <span className="ml-auto text-xs text-[#555]">{totalReactions} reactions</span>
          )}
        </div>

        {/* Comment list */}
        <div className="divide-y divide-[#1a1a1a]">
          {loading && (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-[#1a1a1a]" />
              ))}
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[#555]">
              No comments yet — be the first to share your take.
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="px-5 py-4">
              <div className="mb-1.5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2a2a4e] text-[10px] font-bold text-[#f0a500]">
                  {c.username[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-white">{c.username}</span>
                <span className="text-xs text-[#555]">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed text-[#ccc]">{c.body}</p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => likeC(c.id)}
                  disabled={liked.has(c.id) || disliked.has(c.id)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    liked.has(c.id) ? "text-[#f0a500]" : "text-[#555] hover:text-[#f0a500] disabled:cursor-default"
                  }`}
                >
                  <Heart className="h-3.5 w-3.5" fill={liked.has(c.id) ? "#f0a500" : "none"} />
                  {c.likes > 0 && <span>{c.likes}</span>}
                </button>
                <button
                  onClick={() => dislikeC(c.id)}
                  disabled={liked.has(c.id) || disliked.has(c.id)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    disliked.has(c.id) ? "text-blue-400" : "text-[#555] hover:text-blue-400 disabled:cursor-default"
                  }`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" fill={disliked.has(c.id) ? "currentColor" : "none"} />
                  {c.dislikes > 0 && <span>{c.dislikes}</span>}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comment form */}
        <div className="border-t border-[#1e1e1e] px-5 py-4">
          <form onSubmit={submit} className="space-y-2">
            <textarea
              ref={textRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={authed ? "Share your take on this match…" : "Sign in to join the conversation…"}
              rows={2}
              onClick={() => { if (!authed) setGateOpen(true); }}
              readOnly={!authed}
              className="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2.5 text-sm text-white placeholder:text-[#444] outline-none focus:border-[#f0a500] cursor-text"
            />
            {authed ? (
              <div className="flex items-center justify-between">
                {msg && <p className="text-xs text-red-400">{msg}</p>}
                <button
                  type="submit"
                  disabled={posting || !body.trim()}
                  className="ml-auto rounded-md bg-[#f0a500] px-4 py-1.5 text-xs font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setGateOpen(true)}
                className="w-full rounded-lg border border-[#2a2a2a] py-2 text-xs text-[#888] transition-colors hover:border-[#f0a500] hover:text-white"
              >
                Sign in free to comment →
              </button>
            )}
          </form>
        </div>
      </div>

      {gateOpen && (
        <PredictionSaveGate
          pickLabel="comment"
          stake={0}
          onAuthed={() => { setAuthed(true); setGateOpen(false); setTimeout(() => textRef.current?.focus(), 100); }}
          onClose={() => setGateOpen(false)}
        />
      )}
    </section>
  );
}
